package io.github.goraebap.bit.module.coderef.application;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Seals repository tokens and webhook secrets before they are stored (D-028): AES-256-GCM under a key drawn from
 * `app.git.encryption-key` (generated beside the database when not configured), a fresh nonce each time.
 */
@Component
final class TokenCipher {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int NONCE = 12;
    private final SecretKeySpec key;

    /** Without a key the feature is off (D-030): the server runs, and connecting says why it cannot. */
    TokenCipher(@Value("${app.git.encryption-key:}") String secret) {
        if (secret == null || secret.isBlank()) {
            this.key = null;
            return;
        }
        try {
            this.key = new SecretKeySpec(
                    MessageDigest.getInstance("SHA-256").digest(secret.getBytes(StandardCharsets.UTF_8)), "AES");
        } catch (GeneralSecurityException impossible) {
            throw new IllegalStateException(impossible);
        }
    }

    boolean configured() {
        return key != null;
    }

    String seal(String plain) {
        if (key == null) throw CodeRefErrorCode.INTEGRATION_NOT_CONFIGURED.raise();
        try {
            byte[] nonce = new byte[NONCE];
            RANDOM.nextBytes(nonce);
            var cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, nonce));
            byte[] sealed = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));
            return "v1:"
                    + Base64.getEncoder()
                            .encodeToString(ByteBuffer.allocate(NONCE + sealed.length)
                                    .put(nonce)
                                    .put(sealed)
                                    .array());
        } catch (GeneralSecurityException failure) {
            throw new IllegalStateException("Could not seal a secret", failure);
        }
    }

    String open(String sealed) {
        if (key == null) throw CodeRefErrorCode.INTEGRATION_NOT_CONFIGURED.raise();
        if (sealed == null || !sealed.startsWith("v1:")) throw new IllegalStateException("Unknown sealed format");
        try {
            byte[] all = Base64.getDecoder().decode(sealed.substring(3));
            var cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, all, 0, NONCE));
            return new String(cipher.doFinal(all, NONCE, all.length - NONCE), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException failure) {
            throw new IllegalStateException(
                    "Could not open a sealed secret (was the encryption key changed?)", failure);
        }
    }

    /** A new webhook secret: 32 random bytes, URL-safe. */
    String newSecret() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
