package cl.licitawatch.usuarios.bd;

import jakarta.persistence.*;

@Entity @Table(name = "pyme", uniqueConstraints = {
        @UniqueConstraint(name = "uq_pyme_usuario", columnNames = "usuario_id"), @UniqueConstraint(name = "uq_pyme_rut", columnNames = "rut")})
public class Pyme extends PerfilBase {
    @Column(name = "tamano_empresa_id", nullable = false) private Integer tamanoEmpresaId;
    @Override public Integer getTamanoEmpresaId() { return tamanoEmpresaId; }
    public void setTamanoEmpresaId(Integer v) { tamanoEmpresaId = v; }
}
