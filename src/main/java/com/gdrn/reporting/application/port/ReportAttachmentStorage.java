package com.gdrn.reporting.application.port;

import com.gdrn.reporting.application.AttachmentUpload;
import java.io.InputStream;
import java.util.UUID;

public interface ReportAttachmentStorage {
    StoredFile store(UUID attachmentId, AttachmentUpload upload);
    InputStream open(String storageKey);
    void delete(String storageKey);

    record StoredFile(String storageKey, String mediaType, long sizeBytes) {}
}
