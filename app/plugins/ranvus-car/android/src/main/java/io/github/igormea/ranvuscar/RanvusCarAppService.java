package io.github.igormea.ranvuscar;

import androidx.annotation.NonNull;
import androidx.car.app.CarAppService;
import androidx.car.app.Session;
import androidx.car.app.validation.HostValidator;

/** Ponto de entrada do Android Auto. Uso pessoal: aceita qualquer "host" (Android Auto em modo desenvolvedor). */
public class RanvusCarAppService extends CarAppService {
    @NonNull @Override public HostValidator createHostValidator() { return HostValidator.ALLOW_ALL_HOSTS_VALIDATOR; }
    @NonNull @Override public Session onCreateSession() { return new RanvusSession(); }
}
