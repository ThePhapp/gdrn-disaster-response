package com.gdrn.reporting.infrastructure.storage;

import com.gdrn.reporting.application.AttachmentStorageException;
import com.gdrn.reporting.application.AttachmentUpload;
import com.gdrn.reporting.application.AttachmentValidationException;
import com.gdrn.reporting.application.ReportAttachmentService;
import com.gdrn.reporting.application.port.ReportAttachmentStorage;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.util.Iterator;
import java.util.Locale;
import java.util.UUID;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;

/** Private local storage adapter. The root must never be served by the frontend web server. */
public final class FileSystemReportAttachmentStorage implements ReportAttachmentStorage {
    private final Path root;

    public FileSystemReportAttachmentStorage(Path root) {
        this.root = root.toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.root);
        } catch (IOException error) {
            throw new AttachmentStorageException("Attachment storage is unavailable.", error);
        }
    }

    @Override
    public StoredFile store(UUID attachmentId, AttachmentUpload upload) {
        validateDeclared(upload);
        Path temporary = null;
        try {
            temporary = Files.createTempFile(root, ".report-upload-", ".tmp");
            long size = copyWithLimit(upload.content(), temporary);
            String mediaType = inspectImage(temporary, upload.contentType());
            String extension = mediaType.equals("image/png") ? ".png" : ".jpg";
            String storageKey = attachmentId + extension;
            Path target = safePath(storageKey);
            move(temporary, target);
            temporary = null;
            return new StoredFile(storageKey, mediaType, size);
        } catch (AttachmentValidationException error) {
            throw error;
        } catch (IOException error) {
            throw new AttachmentStorageException("Attachment storage is unavailable.", error);
        } finally {
            if (temporary != null) try { Files.deleteIfExists(temporary); } catch (IOException ignored) { }
        }
    }

    @Override
    public InputStream open(String storageKey) {
        try {
            return Files.newInputStream(safePath(storageKey), StandardOpenOption.READ);
        } catch (IOException | RuntimeException error) {
            throw new AttachmentStorageException("Attachment content is unavailable.", error);
        }
    }

    @Override
    public void delete(String storageKey) {
        try {
            Files.deleteIfExists(safePath(storageKey));
        } catch (IOException | RuntimeException error) {
            throw new AttachmentStorageException("Attachment could not be deleted.", error);
        }
    }

    private static void validateDeclared(AttachmentUpload upload) {
        if (upload.originalFilename() == null || upload.originalFilename().isBlank()) {
            throw new AttachmentValidationException("file", "ATTACHMENT_FILE_REQUIRED", "An image file is required.");
        }
        if (upload.declaredSize() == 0) {
            throw new AttachmentValidationException("file", "ATTACHMENT_EMPTY", "The image file is empty.");
        }
        if (upload.declaredSize() > ReportAttachmentService.MAX_FILE_SIZE_BYTES) {
            throw new AttachmentValidationException("file", "ATTACHMENT_TOO_LARGE", "Images must be 5 MiB or smaller.");
        }
        String contentType = normalizeContentType(upload.contentType());
        if (!contentType.equals("image/jpeg") && !contentType.equals("image/png")) {
            throw new AttachmentValidationException("file", "ATTACHMENT_UNSUPPORTED_FORMAT", "Only JPEG and PNG images are supported.");
        }
    }

    private static long copyWithLimit(InputStream input, Path target) throws IOException {
        long total = 0;
        byte[] buffer = new byte[8192];
        try (var output = Files.newOutputStream(target, StandardOpenOption.TRUNCATE_EXISTING)) {
            int read;
            while ((read = input.read(buffer)) >= 0) {
                if (read == 0) continue;
                total += read;
                if (total > ReportAttachmentService.MAX_FILE_SIZE_BYTES) {
                    throw new AttachmentValidationException("file", "ATTACHMENT_TOO_LARGE", "Images must be 5 MiB or smaller.");
                }
                output.write(buffer, 0, read);
            }
        }
        if (total == 0) throw new AttachmentValidationException("file", "ATTACHMENT_EMPTY", "The image file is empty.");
        return total;
    }

    private static String inspectImage(Path file, String declaredContentType) throws IOException {
        String declared = normalizeContentType(declaredContentType);
        try (ImageInputStream input = ImageIO.createImageInputStream(file.toFile())) {
            if (input == null) throw unsupportedFormat();
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw unsupportedFormat();
            ImageReader reader = readers.next();
            try {
                reader.setInput(input, true, true);
                String detected = reader.getFormatName().toLowerCase(Locale.ROOT);
                String detectedType = switch (detected) {
                    case "jpeg", "jpg" -> "image/jpeg";
                    case "png" -> "image/png";
                    default -> throw unsupportedFormat();
                };
                if (!detectedType.equals(declared)) throw unsupportedFormat();
                if (reader.getWidth(0) < 1 || reader.getHeight(0) < 1) throw unsupportedFormat();
                return detectedType;
            } finally {
                reader.dispose();
            }
        }
    }

    private Path safePath(String storageKey) {
        if (storageKey == null || !storageKey.matches("[0-9a-fA-F-]{36}\\.(jpg|png)")) {
            throw new AttachmentStorageException("Attachment storage key is invalid.");
        }
        Path path = root.resolve(storageKey).normalize();
        if (!path.startsWith(root) || path.getParent() == null || !path.getParent().equals(root)) {
            throw new AttachmentStorageException("Attachment storage key is invalid.");
        }
        return path;
    }

    private static void move(Path source, Path target) throws IOException {
        try {
            Files.move(source, target, StandardCopyOption.ATOMIC_MOVE);
        } catch (AtomicMoveNotSupportedException error) {
            Files.move(source, target, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    private static String normalizeContentType(String contentType) {
        if (contentType == null) return "";
        int separator = contentType.indexOf(';');
        return (separator >= 0 ? contentType.substring(0, separator) : contentType).trim().toLowerCase(Locale.ROOT);
    }

    private static AttachmentValidationException unsupportedFormat() {
        return new AttachmentValidationException("file", "ATTACHMENT_UNSUPPORTED_FORMAT", "Only JPEG and PNG images are supported.");
    }
}
