package io.github.goraebap.bit.shared.domain;

import java.security.SecureRandom;

/**
 * Entity ids (D-083): ten characters of A-Z, a-z and 0-9 drawn from {@link SecureRandom}, the first always a letter.
 * The id columns V1-V8 declared {@code uuid} have SQLite's NUMERIC affinity, which would store an all-digit id such as
 * {@code 0123456789} as the number 123456789; a leading letter keeps every id text.
 */
public final class Ids {
    public static final int LENGTH = 10;
    public static final String PATTERN = "[A-Za-z][A-Za-z0-9]{9}";
    private static final String LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    private static final String ALPHABET = LETTERS + "0123456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private Ids() {}

    public static String newId() {
        var id = new char[LENGTH];
        id[0] = LETTERS.charAt(RANDOM.nextInt(LETTERS.length()));
        for (int i = 1; i < LENGTH; i++) id[i] = ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length()));
        return new String(id);
    }

    public static boolean isId(String value) {
        if (value == null || value.length() != LENGTH || LETTERS.indexOf(value.charAt(0)) < 0) return false;
        for (int i = 1; i < LENGTH; i++) if (ALPHABET.indexOf(value.charAt(i)) < 0) return false;
        return true;
    }

    /** The id {@code raw} names, refused with an {@link IllegalArgumentException} when it is not one. */
    public static String parse(String raw) {
        if (!isId(raw)) throw new IllegalArgumentException("Invalid id");
        return raw;
    }
}
