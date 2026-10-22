package io.github.goraebap.bit.shared.error;

import org.springframework.http.HttpStatus;

public interface ErrorCode {

    HttpStatus status();

    String message();

    String name();

    default String code() {
        return name();
    }

    default BusinessException raise() {
        return new BusinessException(this, message());
    }

    default BusinessException raise(String detail) {
        return new BusinessException(this, detail);
    }
}
