package cl.licitawatch.usuarios.bff;

import cl.licitawatch.common.ApiException;
import cl.licitawatch.usuarios.ambassador.SiiAmbassador;
import cl.licitawatch.usuarios.ambassador.SiiAmbassador.ConsultaSii;
import cl.licitawatch.usuarios.bd.Repos.*;
import cl.licitawatch.usuarios.bff.Dto.*;
import cl.licitawatch.usuarios.bs.PerfilService;
import cl.licitawatch.usuarios.bs.Rut;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class SiiCatalogoController {
    private final SiiAmbassador sii; private final PerfilService perfiles;
    private final RubroRepo rubros; private final RegionRepo regiones; private final CiudadRepo ciudades; private final TamanoRepo tamanos;
    public SiiCatalogoController(SiiAmbassador sii, PerfilService perfiles, RubroRepo rubros, RegionRepo regiones, CiudadRepo ciudades, TamanoRepo tamanos) {
        this.sii = sii; this.perfiles = perfiles; this.rubros = rubros; this.regiones = regiones; this.ciudades = ciudades; this.tamanos = tamanos;
    }

    @GetMapping("/api/sii/{rut}")
    public ConsultaSii consultar(@PathVariable String rut) {
        String r = Rut.limpiar(rut);
        if (perfiles.rutExiste(r)) throw ApiException.conflicto("Este RUT de empresa ya está registrado en LicitaWatch");
        return sii.consultar(r);
    }

    @GetMapping("/api/catalogos/rubros") public List<CatalogoDto> rubros() { return rubros.findAllByOrderByNombre().stream().map(c -> new CatalogoDto(c.getId(), c.getNombre())).toList(); }
    @GetMapping("/api/catalogos/regiones") public List<CatalogoDto> regiones() { return regiones.findAllByOrderByNombre().stream().map(c -> new CatalogoDto(c.getId(), c.getNombre())).toList(); }
    @GetMapping("/api/catalogos/tamanos") public List<CatalogoDto> tamanos() { return tamanos.findAllByOrderByIdAsc().stream().map(c -> new CatalogoDto(c.getId(), c.getNombre())).toList(); }

    @GetMapping("/api/catalogos/ciudades")
    public List<CiudadDto> ciudades(@RequestParam(required = false) Integer regionId) {
        var l = regionId == null ? ciudades.findAllByOrderByNombre() : ciudades.findByRegionIdOrderByNombre(regionId);
        return l.stream().map(c -> new CiudadDto(c.getId(), c.getNombre(), c.getRegionId())).toList();
    }
}
