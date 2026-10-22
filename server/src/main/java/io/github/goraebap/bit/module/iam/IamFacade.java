package io.github.goraebap.bit.module.iam;

import io.github.goraebap.bit.shared.web.CurrentUser;
import java.util.Optional;

public interface IamFacade {
    Optional<CurrentUser> authenticate(String token, CurrentUser.Method method);
}
