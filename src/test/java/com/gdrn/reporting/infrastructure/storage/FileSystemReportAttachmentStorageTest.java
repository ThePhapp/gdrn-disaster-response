package com.gdrn.reporting.infrastructure.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.gdrn.reporting.application.AttachmentUpload;
import com.gdrn.reporting.application.AttachmentValidationException;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class FileSystemReportAttachmentStorageTest {
    @TempDir Path root;

    @Test
    void storesOnlyAnImageWhoseDetectedFormatMatchesTheDeclaredMimeType() throws Exception {
        byte[] png = image("png");
        var storage = new FileSystemReportAttachmentStorage(root);
        UUID id = UUID.randomUUID();

        var stored = storage.store(id, new AttachmentUpload("evidence.png", "image/png", png.length,
                new ByteArrayInputStream(png)));

        assertThat(stored.mediaType()).isEqualTo("image/png");
        assertThat(stored.sizeBytes()).isEqualTo(png.length);
        assertThat(Files.readAllBytes(root.resolve(stored.storageKey()))).containsExactly(png);
        assertThatThrownBy(() -> storage.store(UUID.randomUUID(), new AttachmentUpload("bad.jpg", "image/jpeg", png.length,
                new ByteArrayInputStream(png)))).isInstanceOf(AttachmentValidationException.class);
    }

    @Test
    void rejectsOversizedAndTraversalKeys() {
        var storage = new FileSystemReportAttachmentStorage(root);
        assertThatThrownBy(() -> storage.store(UUID.randomUUID(), new AttachmentUpload("large.png", "image/png",
                5L * 1024 * 1024 + 1, new ByteArrayInputStream(new byte[]{1}))))
                .isInstanceOf(AttachmentValidationException.class);
        assertThatThrownBy(() -> storage.open("../secret.png")).isInstanceOf(RuntimeException.class);
    }

    private static byte[] image(String format) throws Exception {
        var image = new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);
        var output = new ByteArrayOutputStream();
        ImageIO.write(image, format, output);
        return output.toByteArray();
    }
}
