package com.prani.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Slf4j
@Service
public class QrCodeService {

    @Value("${prani.public-dir:./public}")
    private String publicDir;

    @Value("${prani.frontend-url:https://prani.app}")
    private String frontendUrl;

    public String generateItemQrCode(String itemId) {
        try {
            Path qrDir = Paths.get(publicDir, "qrcodes");
            Files.createDirectories(qrDir);

            String payload = frontendUrl + "/inventory/" + itemId;
            BitMatrix matrix = new MultiFormatWriter()
                .encode(payload, BarcodeFormat.QR_CODE, 200, 200);

            String filename = itemId + ".png";
            Path outputPath = qrDir.resolve(filename);
            MatrixToImageWriter.writeToPath(matrix, "PNG", outputPath);

            return "/public/qrcodes/" + filename;
        } catch (Exception e) {
            log.error("QR code generation failed for item {}: {}", itemId, e.getMessage());
            throw new RuntimeException("Failed to generate QR code");
        }
    }
}
