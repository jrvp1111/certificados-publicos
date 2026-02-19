import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../../utils/supabaseClient";
import { QRCodeCanvas } from "qrcode.react";


function fmtDate(isoDate) {
  if (!isoDate) return "";
  // isoDate viene como YYYY-MM-DD
  const [y, m, d] = String(isoDate).split("-");
  if (!y || !m || !d) return String(isoDate);
  return `${d}/${m}/${y}`;
}

function calcStatus({ revoked, valid_until }) {
  if (revoked) return { key: "revocado", label: "REVOCADO" };

  const today = new Date();
  const valid = new Date(`${valid_until}T00:00:00`);
  const diffDays = Math.floor((valid - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { key: "vencido", label: "VENCIDO" };
  if (diffDays <= 30) return { key: "proximo", label: "PRÓXIMO A VENCER" };
  return { key: "vigente", label: "VIGENTE" };
}

export default function VerifyCertificate() {
  const location = useLocation();

  // token = lo que venga después de /verify/
  const token = useMemo(() => {
    const raw = (location.pathname || "").replace("/verify/", "");
    return raw.split("/")[0].trim(); // por si traen /verify/token/loquesea
  }, [location.pathname]);

  const [loading, setLoading] = useState(true);
  const [certificate, setCertificate] = useState(null);
  const [error, setError] = useState("");



  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setLoading(true);
      setError("");
      setCertificate(null);

      if (!token) {
        if (mounted) {
          setError("Token inválido");
          setLoading(false);
        }
        return;
      }

      // ✅ Seleccionamos SOLO lo público (snapshots + razón social)
      const { data, error } = await supabase
        .from("certificates")
        .select(
          `
          folio,
          token,
          issue_date,
          valid_until,
          revoked,
          equipment_label_snapshot,
          conformity_text_snapshot,
          scope_text_snapshot,
          client:client_id (
            razon_social
          )
        `
        )
        .eq("token", token)
        .single();

      if (!mounted) return;

      if (error || !data) {
        setError("Certificado no válido");
        setLoading(false);
        return;
      }

      setCertificate(data);
      setLoading(false);
    };

    run();

    return () => {
      mounted = false;
    };
  }, [token]);

  const status = useMemo(() => {
    if (!certificate) return null;
    return calcStatus({
      revoked: certificate.revoked,
      valid_until: certificate.valid_until,
    });
  }, [certificate]);

  const statusPillClass = useMemo(() => {
    if (!status) return "bg-gray-600";
    if (status.key === "vigente") return "bg-green-600";
    if (status.key === "proximo") return "bg-yellow-600";
    if (status.key === "vencido") return "bg-orange-600";
    return "bg-red-600"; // revocado
  }, [status]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow p-6 w-full max-w-xl text-center">
          <div className="text-lg font-semibold">Verificando certificado…</div>
          <div className="text-sm text-gray-600 mt-2">Token: {token || "—"}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow p-6 w-full max-w-xl text-center">
          <div className="text-xl font-bold text-red-600">{error}</div>
          <div className="text-sm text-gray-600 mt-2">
            Si crees que es un error, solicita a tu proveedor el QR correcto.
          </div>
        </div>
      </div>
    );
  }

  // certificate existe aquí
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="relative bg-white border-4 border-gray-200 rounded-xl shadow-xl p-10 w-full max-w-3xl">


{status?.key === "vencido" && (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    <div className="text-red-200 text-6xl font-bold rotate-[-30deg] opacity-40">
      VENCIDO
    </div>
  </div>
)}

        
        <div className="flex flex-col items-center text-center gap-2">
          <h1 className="text-2xl font-bold">CERTIFICADO #{certificate.folio}</h1>

          {status && (
            <span className={`text-white px-4 py-2 rounded-full text-sm font-semibold ${statusPillClass}`}>
              {status.label}
            </span>
          )}

          <div className="text-sm text-gray-500 mt-2">
                Verificación digital validada mediante código QR único.
          </div>

        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">CLIENTE</div>
            <div className="font-semibold">
              {certificate.client?.razon_social || "—"}
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">EQUIPO</div>
            <div className="font-semibold">
              {certificate.equipment_label_snapshot || "—"}
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">FECHA DE EMISIÓN</div>
            <div className="font-semibold">{fmtDate(certificate.issue_date)}</div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">VIGENCIA HASTA</div>
            <div className="font-semibold">{fmtDate(certificate.valid_until)}</div>
          </div>
        </div>

        <div className="mt-6">
          <div className="border rounded-lg p-4 mb-4">
            <div className="text-xs text-gray-500 mb-2">TEXTO DE CONFORMIDAD</div>
            <div className="whitespace-pre-line text-sm">
              {certificate.conformity_text_snapshot || "—"}
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-2">ALCANCE</div>
            <div className="whitespace-pre-line text-sm">
              {certificate.scope_text_snapshot || "—"}
            </div>
          </div>
        </div>

<div className="mt-10 flex flex-col items-center gap-2">
  <div className="p-4 bg-white border rounded-lg shadow-sm">
    <QRCodeCanvas
      value={`${window.location.origin}/verify/${certificate.token}`}
      size={160}
      level="H"
      includeMargin={true}
    />
  </div>
  <div className="text-xs text-gray-500 text-center">
    Escanee el código QR para validar autenticidad.
  </div>
</div>


        <div className="mt-6 text-xs text-gray-500 text-center">
          Este certificado se valida mediante token único ligado al QR.
        </div>
      </div>
    </div>
  );
}
