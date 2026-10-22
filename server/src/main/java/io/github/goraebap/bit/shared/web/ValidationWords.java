package io.github.goraebap.bit.shared.web;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.metadata.ConstraintDescriptor;
import java.util.Map;

/**
 * The sentence a field error carries for a broken constraint. The validator's own messages are framework words in the
 * server's language ("must not be blank"), so each standard constraint gets its plain Korean sentence here; a message
 * the code wrote on the annotation itself is kept.
 */
final class ValidationWords {
    static final String UNREADABLE = "값의 형식이 올바르지 않습니다";
    static final String REQUIRED = "필수 입력값입니다";
    private static final String INVALID = "입력값이 올바르지 않습니다";

    private ValidationWords() {}

    static String of(ConstraintViolation<?> violation) {
        ConstraintDescriptor<?> descriptor = violation.getConstraintDescriptor();
        Map<String, Object> attributes = descriptor.getAttributes();
        Object value = violation.getInvalidValue();
        String unit = value instanceof CharSequence ? "자" : "개";
        return switch (descriptor.getAnnotation().annotationType().getSimpleName()) {
            case "NotNull", "NotBlank" -> REQUIRED;
            case "NotEmpty" -> value instanceof CharSequence || value == null ? REQUIRED : "하나 이상 있어야 합니다";
            case "Size", "Length" -> size(number(attributes, "min"), number(attributes, "max"), unit);
            case "Email" -> "유효한 이메일 형식이 아닙니다";
            case "Pattern" -> UNREADABLE;
            case "Min" -> attributes.get("value") + " 이상이어야 합니다";
            case "Max" -> attributes.get("value") + " 이하여야 합니다";
            case "DecimalMin" ->
                attributes.get("value")
                        + (Boolean.FALSE.equals(attributes.get("inclusive")) ? "보다 커야 합니다" : " 이상이어야 합니다");
            case "DecimalMax" ->
                attributes.get("value")
                        + (Boolean.FALSE.equals(attributes.get("inclusive")) ? "보다 작아야 합니다" : " 이하여야 합니다");
            case "Positive" -> "0보다 커야 합니다";
            case "PositiveOrZero" -> "0 이상이어야 합니다";
            case "Negative" -> "0보다 작아야 합니다";
            case "NegativeOrZero" -> "0 이하여야 합니다";
            case "Digits" ->
                "정수 " + attributes.get("integer") + "자리, 소수 " + attributes.get("fraction") + "자리까지 입력할 수 있습니다";
            case "Past" -> "지난 날짜여야 합니다";
            case "PastOrPresent" -> "오늘이나 지난 날짜여야 합니다";
            case "Future" -> "앞으로의 날짜여야 합니다";
            case "FutureOrPresent" -> "오늘이나 앞으로의 날짜여야 합니다";
            default -> ownMessage(descriptor, violation.getMessage());
        };
    }

    private static String size(long min, long max, String unit) {
        if (max == Integer.MAX_VALUE) return min + unit + " 이상이어야 합니다";
        if (min <= 0) return max + unit + " 이하로 입력해 주세요";
        if (min == max) return min + unit + "여야 합니다";
        return min + unit + "에서 " + max + unit + " 사이여야 합니다";
    }

    private static long number(Map<String, Object> attributes, String name) {
        return attributes.get(name) instanceof Number number ? number.longValue() : 0;
    }

    /**
     * A constraint outside the standard ones speaks with the message its annotation names, unless that is still the
     * validator's own template.
     */
    private static String ownMessage(ConstraintDescriptor<?> descriptor, String message) {
        String template = descriptor.getMessageTemplate();
        boolean framework =
                template == null || template.startsWith("{jakarta.validation") || template.startsWith("{org.hibernate");
        return framework || message == null || message.isBlank() ? INVALID : message;
    }
}
