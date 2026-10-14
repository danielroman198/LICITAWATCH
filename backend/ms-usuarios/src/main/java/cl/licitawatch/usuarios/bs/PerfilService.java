package cl.licitawatch.usuarios.bs;

import cl.licitawatch.usuarios.bd.*;
import cl.licitawatch.usuarios.bd.Repos.*;
import cl.licitawatch.usuarios.bff.Dto.PerfilDto;
import org.springframework.stereotype.Service;

import java.util.Optional;

/** Busca el perfil de un usuario en la tabla que corresponde a su rol (licitador, pyme o administrador). */
@Service
public class PerfilService {
    private final LicitadorRepo licitadores; private final PymeRepo pymes; private final AdministradorRepo admins;
    public PerfilService(LicitadorRepo licitadores, PymeRepo pymes, AdministradorRepo admins) { this.licitadores = licitadores; this.pymes = pymes; this.admins = admins; }

    public Optional<PerfilBase> empresa(Usuario u) {
        return switch (u.getRolNombre()) {
            case "LICITADOR" -> licitadores.findByUsuarioId(u.getId()).map(x -> (PerfilBase) x);
            case "PYME" -> pymes.findByUsuarioId(u.getId()).map(x -> (PerfilBase) x);
            default -> Optional.empty();
        };
    }

    public PerfilDto dto(Usuario u) {
        if ("ADMIN".equals(u.getRolNombre())) return admins.findByUsuarioId(u.getId()).map(Mapeo::perfil).orElse(null);
        return empresa(u).map(Mapeo::perfil).orElse(null);
    }

    public String nombre(Usuario u) {
        if ("ADMIN".equals(u.getRolNombre())) return admins.findByUsuarioId(u.getId()).map(Administrador::getNombre).orElse(u.getEmail());
        return empresa(u).map(PerfilBase::getRazonSocial).orElse(u.getEmail());
    }

    public boolean rutExiste(String rut) { return licitadores.existsByRut(rut) || pymes.existsByRut(rut); }
    public boolean rutPersonaExiste(String rut) { return licitadores.existsByRutPersona(rut) || pymes.existsByRutPersona(rut); }
}
