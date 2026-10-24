package com.gdrn.reporting.application;

import com.gdrn.reporting.domain.ReportAttachment;
import java.io.InputStream;

public record AttachmentDownload(ReportAttachment attachment, InputStream content) {}
