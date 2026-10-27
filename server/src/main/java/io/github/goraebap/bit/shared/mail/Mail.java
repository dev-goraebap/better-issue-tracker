package io.github.goraebap.bit.shared.mail;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

/**
 * Mail (D-027, D-030): on when SMTP is set up (SPRING_MAIL_HOST and the rest of spring.mail.*), off otherwise, the app
 * running the same either way. Sending is plain text from MAIL_FROM, else the SMTP user. Nothing here retries; a caller
 * that must not lose a mail keeps its own record of what was sent.
 */
@Component
public class Mail {
    private final ObjectProvider<JavaMailSender> sender;
    private final String from;

    Mail(
            ObjectProvider<JavaMailSender> sender,
            @Value("${app.mail.from:}") String from,
            @Value("${spring.mail.username:}") String username) {
        this.sender = sender;
        this.from = from.isBlank() ? username : from;
    }

    /** Whether mail can be sent: SMTP is set up. */
    public boolean available() {
        return sender.getIfAvailable() != null;
    }

    /** Sends one plain-text mail; throws when mail is off or the server refuses it. */
    public void send(String to, String subject, String text) {
        var mailer = sender.getIfAvailable();
        if (mailer == null) throw new IllegalStateException("Mail is not configured");
        var message = new SimpleMailMessage();
        if (!from.isBlank()) message.setFrom(from);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        mailer.send(message);
    }
}
