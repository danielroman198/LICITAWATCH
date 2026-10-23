package cl.licitawatch.usuarios.ambassador;

import cl.licitawatch.common.ApiException;
import cl.licitawatch.usuarios.bs.Rut;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.Map;

/** Modo pruebas: valida dígito verificador y devuelve datos ficticios o de empresas públicas conocidas. */
@Component
@ConditionalOnProperty(name = "lw.sii.modo", havingValue = "stub", matchIfMissing = true)
public class SiiStub implements SiiAmbassador {
    private static final Map<String, String> PUBLICAS = Map.ofEntries(
            Map.entry("90749000", "Falabella S.A."), Map.entry("93834000", "Cencosud S.A."), Map.entry("97004000", "Banco de Chile"),
            Map.entry("89862200", "LATAM Airlines Group S.A."), Map.entry("99520000", "Compañía de Petróleos de Chile Copec S.A."),
            Map.entry("92580000", "Entel S.A."), Map.entry("61704000", "Corporación Nacional del Cobre de Chile"),
            Map.entry("76042014", "Walmart Chile S.A."), Map.entry("90413000", "Cervecerías Unidas S.A."), Map.entry("96792430", "Sodimac S.A."),
            Map.entry("97030000", "Banco del Estado de Chile"), Map.entry("61219000", "Empresa de Transporte de Pasajeros Metro S.A."));

    @Override
    public ConsultaSii consultar(String rut) {
        if (!Rut.valido(rut)) throw ApiException.invalido("El RUT no es válido (dígito verificador incorrecto)");
        if (!Rut.esEmpresa(rut)) throw ApiException.noEncontrado("El RUT ingresado corresponde a una persona natural, no a una empresa");
        String cuerpo = rut.substring(0, rut.length() - 1);
        String nombre = PUBLICAS.get(cuerpo);
        return new ConsultaSii(Rut.formatear(rut), nombre != null ? nombre : "Empresa de prueba " + Rut.formatear(rut),
                "Actividades empresariales", "Inicio de actividades vigente", "2015-03-01", nombre == null);
    }
}
