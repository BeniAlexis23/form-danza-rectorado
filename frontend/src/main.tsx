import React, { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  ArrowLeft,
  CalendarDays,
  MapPin,
  Users,
  Music2,
  FileText,
  Check,
  ShieldCheck,
  Download,
  Plus,
  Trash2,
  Search,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import {
  participantSchema,
  createDelegationSchema,
  type Participant,
  type Delegation,
} from "../../shared/rules";
import "./styles.css";
import { PdfPages } from "./PdfPages";
type EventInfo = { closesAt: string; open: boolean };
type State = { data: Delegation | null; finalizedAt: string | null };
async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(`/api${path}`, options);
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "No se pudo completar la solicitud.");
  return data;
}
function App() {
  const [admin, setAdmin] = useState(location.hash === "#coordinacion");
  return (
    <>
      <header>
        <div className="header-inner">
          <a href="#" className="brand" onClick={() => setAdmin(false)}>
            <img
              src="/escudo-undc.png"
              alt="Escudo de la Universidad Nacional de Cañete"
            />
            <span>
              <strong>UNIVERSIDAD NACIONAL DE CAÑETE</strong>
              <small>RECTORADO · XVII ANIVERSARIO</small>
            </span>
          </a>
          <button
            className="header-link"
            onClick={() => {
              setAdmin(!admin);
              location.hash = admin ? "" : "coordinacion";
            }}
          >
            {admin ? (
              "Volver al registro"
            ) : (
              <>
                <ShieldCheck size={16} />
                Coordinación
              </>
            )}
          </button>
        </div>
      </header>
      <nav>
        <div className="nav-inner">
          <span>
            <span className="nav-dot" /> Pasacalle cultural y concurso de danzas
          </span>
          <a href="/bases.pdf" target="_blank" rel="noreferrer">
            <FileText size={15} /> Consultar bases <span>↗</span>
          </a>
        </div>
      </nav>
      {admin ? <Admin /> : <Registration />}
      <footer>
        <div>
          <img src="/escudo-undc.png" alt="" />
          <span>
            Universidad Nacional de Cañete{" "}
            <small>Identidad, tradición y orgullo universitario.</small>
          </span>
        </div>
        <span>Rectorado · 2026</span>
      </footer>
    </>
  );
}
function Registration() {
  const [event, setEvent] = useState<EventInfo | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [receipt, setReceipt] = useState<{ code: string; message: string } | null>(
      null,
    ),
    [step, setStep] = useState(0);
  const [data, setData] = useState({
    firstName: "",
    lastName: "",
    dni: "",
    dependency: "",
    phone: "",
    consent: false,
  });
  useEffect(() => {
    api("/event")
      .then(setEvent)
      .catch(() =>
        setError(
          "No se pudo conectar al servidor. El registro estará disponible cuando se restablezca la conexión.",
        ),
      );
  }, []);
  const update = (key: keyof typeof data, value: string | boolean) =>
    setData({ ...data, [key]: value });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const result = participantSchema.safeParse(data);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    if (step === 0) {
      setStep(1);
      return;
    }
    setBusy(true);
    try {
      setReceipt(
        await api("/participants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result.data),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main>
      <div className="breadcrumb">
        Aniversario UNDC <span>/</span> Rectorado <span>/</span> Inscripción
      </div>
      <section className="hero">
        <div>
          <span className="eyebrow">
            TRADICIÓN, SABER Y ORGULLO UNIVERSITARIO
          </span>
          <h1>
            Juntos, llevamos nuestra
            <br />
            <em>tradición al escenario.</em>
          </h1>
          <p>
            Forma parte de la delegación del Rectorado en el pasacalle cultural
            <br className="desktop" /> y concurso de danzas por nuestro XVII
            aniversario.
          </p>
          <div className="hero-meta">
            <span>
              <CalendarDays size={17} />
              23 de noviembre de 2026
            </span>
            <span>
              <MapPin size={17} />
              San Vicente de Cañete
            </span>
          </div>
        </div>
        <div className="anniversary" aria-label="XVII aniversario UNDC">
          <span>CELEBRAMOS</span>
          <strong>XVII</strong>
          <span>ANIVERSARIO</span>
          <i>2009 — 2026</i>
        </div>
      </section>
      <div className="registration-layout">
        <div>
          <div className="stepper">
            <span className={step === 0 ? "current" : "done"}>
              <b>{step > 0 ? <Check size={15} /> : 1}</b> Tus datos
            </span>
            <i />
            <span className={step === 1 ? "current" : ""}>
              <b>2</b> Revisar y registrar
            </span>
          </div>
          <section className="card registration-card">
            {receipt ? (
              <div className="success">
                <div className="success-icon">
                  <Check />
                </div>
                <span className="eyebrow">REGISTRO RECIBIDO</span>
                <h2>¡Gracias por ser parte!</h2>
                <p>{receipt.message}</p>
                <div className="receipt">
                  <small>CÓDIGO DE REGISTRO</small>
                  <strong>{receipt.code}</strong>
                </div>
                <p className="muted">
                  Guarda tu código. Coordinación del Rectorado se comunicará
                  contigo para organizar la delegación.
                </p>
                <button
                  className="primary"
                  onClick={() => {
                    setReceipt(null);
                    setStep(0);
                    setData({
                      firstName: "",
                      lastName: "",
                      dni: "",
                      dependency: "",
                      phone: "",
                      consent: false,
                    });
                  }}
                >
                  Registrar a otra persona <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="card-heading">
                  <div className="icon-box">
                    <Users size={22} />
                  </div>
                  <div>
                    <h2>
                      {step === 0
                        ? "Inscripción de participante"
                        : "Revisa tu inscripción"}
                    </h2>
                    <p>
                      {step === 0
                        ? "Completa tus datos para sumarte a la delegación."
                        : "Confirma que tus datos sean correctos antes de enviarlos."}
                    </p>
                  </div>
                </div>
                <div className="form-notice">
                  <span>i</span> Registro exclusivo para el personal de las
                  dependencias del Rectorado.
                </div>
                <form onSubmit={submit}>
                  {step === 0 ? (
                    <>
                      <div className="form-grid">
                        <Field label="Nombres" required>
                          <input
                            autoComplete="given-name"
                            required
                            maxLength={150}
                            placeholder="Ingresa tus nombres"
                            value={data.firstName}
                            onChange={(e) =>
                              update("firstName", e.target.value)
                            }
                          />
                        </Field>
                        <Field label="Apellidos" required>
                          <input
                            autoComplete="family-name"
                            required
                            maxLength={150}
                            placeholder="Ingresa tus apellidos"
                            value={data.lastName}
                            onChange={(e) => update("lastName", e.target.value)}
                          />
                        </Field>
                        <Field
                          label="Documento nacional de identidad"
                          required
                          hint="8 dígitos, sin espacios."
                        >
                          <input
                            inputMode="numeric"
                            pattern="[0-9]{8}"
                            required
                            maxLength={8}
                            placeholder="Número de DNI"
                            value={data.dni}
                            onChange={(e) =>
                              update("dni", e.target.value.replace(/\D/g, ""))
                            }
                          />
                        </Field>
                        <Field
                          label="Número de celular"
                          required
                          hint="Te contactaremos para las coordinaciones."
                        >
                          <input
                            autoComplete="tel-national"
                            type="tel"
                            required
                            pattern="9[0-9]{8}"
                            maxLength={9}
                            placeholder="9XX XXX XXX"
                            value={data.phone}
                            onChange={(e) =>
                              update("phone", e.target.value.replace(/\D/g, ""))
                            }
                          />
                        </Field>
                        <div className="full">
                          <Field
                            label="Dependencia del Rectorado"
                            required
                            hint="Escribe el nombre completo de la oficina o unidad a la que perteneces."
                          >
                            <input
                              required
                              maxLength={150}
                              placeholder="Ej. Oficina de Tecnologías de la Información"
                              value={data.dependency}
                              onChange={(e) =>
                                update("dependency", e.target.value)
                              }
                            />
                          </Field>
                        </div>
                      </div>
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={data.consent}
                          required
                          onChange={(e) => update("consent", e.target.checked)}
                        />
                        <span>
                          He leído las{" "}
                          <a href="/bases.pdf" target="_blank" rel="noreferrer">
                            bases del concurso
                          </a>{" "}
                          y acepto participar en el pasacalle obligatorio.
                          Autorizo el uso de mis datos para la inscripción y
                          coordinación de la delegación.
                        </span>
                      </label>
                    </>
                  ) : (
                    <>
                      <dl className="review">
                        {[
                          [
                            "Participante",
                            `${data.firstName} ${data.lastName}`,
                          ],
                          ["DNI", data.dni],
                          ["Celular", data.phone],
                          ["Dependencia", data.dependency],
                          ["Delegación", "Rectorado"],
                        ].map(([k, v]) => (
                          <div key={k}>
                            <dt>{k}</dt>
                            <dd>{v}</dd>
                          </div>
                        ))}
                      </dl>
                      <div className="form-notice">
                        La modalidad y las parejas serán definidas por
                        coordinación en la ficha consolidada.
                      </div>
                    </>
                  )}
                  {error && (
                    <p role="alert" className="alert">
                      {error}
                    </p>
                  )}
                  {event && !event.open && (
                    <p className="alert">
                      El plazo de inscripción está cerrado.
                    </p>
                  )}
                  <div className="form-actions">
                    <span>
                      <ShieldCheck size={15} />
                      Tus datos se usarán para este evento.
                    </span>
                    {step === 1 && (
                      <button
                        className="secondary"
                        type="button"
                        onClick={() => setStep(0)}
                      >
                        <ArrowLeft size={16} />
                        Editar
                      </button>
                    )}
                    <button className="primary" disabled={busy || !event?.open}>
                      {busy
                        ? "Registrando…"
                        : step === 0
                          ? "Continuar"
                          : "Confirmar inscripción"}
                      <ArrowRight size={17} />
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
          <p className="below-card">
            <ShieldCheck size={15} /> El registro individual será revisado por
            coordinación antes de la inscripción final.
          </p>
        </div>
        <aside>
          <section className="card event-card">
            <span className="badge">
              <span />{" "}
              {event?.open
                ? "INSCRIPCIONES ABIERTAS"
                : event
                  ? "INSCRIPCIONES CERRADAS"
                  : "CONSULTANDO DISPONIBILIDAD"}
            </span>
            <h3>
              Una celebración que
              <br />
              nos une.
            </h3>
            <p>
              Representemos al Rectorado con el arte y la riqueza de nuestras
              danzas.
            </p>
            <div className="aside-item">
              <CalendarDays />
              <div>
                <small>CIERRE DE INSCRIPCIONES</small>
                <strong>
                  {event
                    ? new Date(
                        new Date(event.closesAt).getTime() - 1,
                      ).toLocaleDateString("es-PE", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        timeZone: "America/Lima",
                      })
                    : "13 de noviembre de 2026"}
                </strong>
              </div>
            </div>
            <div className="aside-item">
              <Music2 />
              <div>
                <small>MODALIDADES DEL CONCURSO</small>
                <strong>Afroperuana o folclórica</strong>
                <span>Una modalidad por delegación</span>
              </div>
            </div>
            <div className="aside-item">
              <Users />
              <div>
                <small>DELEGACIÓN DEL RECTORADO</small>
                <strong>Mínimo 10 parejas</strong>
                <span>Sin límite máximo de participantes</span>
              </div>
            </div>
            <a
              className="bases-link"
              href="/bases.pdf"
              target="_blank"
              rel="noreferrer"
            >
              <FileText size={17} />
              Leer las bases completas <ArrowRight size={16} />
            </a>
          </section>
          <section className="schedule">
            <span className="eyebrow">NOS ENCONTRAMOS EL 23 DE NOVIEMBRE</span>
            <div>
              <b>15:30</b>
              <span>
                Concentración<small>Casa de la Cultura de San Vicente</small>
              </span>
            </div>
            <div>
              <b>16:00</b>
              <span>
                Pasacalle cultural<small>Participación obligatoria</small>
              </span>
            </div>
            <div>
              <b>17:30</b>
              <span>
                Concurso de danzas<small>Parque O’Higgins</small>
              </span>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
function Field({
  label,
  children,
  required,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="field">
      {label}
      {required && <span className="required"> *</span>}
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
const initial: Delegation = {
  modality: "AFROPERUANA",
  dance: "",
  minutes: 7,
  seconds: 0,
  review: "",
  representative: "",
  dni: "",
  phone: "",
  pairs: [],
  acceptedBases: true,
};
function Admin() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);
  const [testMode, setTestMode] = useState(false);
  const [email, setEmail] = useState("");
  const [key, setKey] = useState(""),
    [authenticated, setAuthenticated] = useState(false),
    [people, setPeople] = useState<Participant[]>([]),
    [state, setState] = useState<State | null>(null),
    [data, setData] = useState<Delegation>(initial),
    [query, setQuery] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false),
    [tab, setTab] = useState<"people" | "sheet">("people");
  const [pairs, setPairs] = useState<[number, number][]>([]);
  const headers = {
    Authorization: `Bearer ${key}`,
    "X-Admin-Email": email.trim(),
  };
  async function load() {
    const result = await api("/admin/roster", { headers });
    setPeople(result.people);
    setTestMode(result.testMode === true);
    const s = result.state;
    const d = typeof s?.data === "string" ? JSON.parse(s.data) : s?.data;
    setState({ ...s, data: d });
    if (d) {
      setData(d);
      setPairs(d.pairs);
    }
    setAuthenticated(true);
  }
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function finalize() {
    setError("");
    const result = createDelegationSchema(testMode).safeParse({
      ...data,
      pairs,
    });
    if (!result.success) {
      setError(result.error.issues[0].message);
      setConfirm(false);
      return;
    }
    setBusy(true);
    try {
      await api("/admin/finalize", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });
      await load();
      setConfirm(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function openPreview() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/sheet.pdf", { headers });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error);
      }
      const url = URL.createObjectURL(await r.blob());
      setPreviewUrl(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function csv() {
    const rows = [
      ["Nombres", "Apellidos", "DNI", "Dependencia", "Celular"],
      ...people.map((p) => [
        p.firstName,
        p.lastName,
        p.dni,
        p.dependency,
        p.phone,
      ]),
    ];
    const safe = (v: string) =>
      `"${(/^[=+\-@\t\r]/.test(v) ? "'" + v : v).replaceAll('"', '""')}"`;
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF" + rows.map((r) => r.map(safe).join(";")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "consolidado-rectorado.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (!authenticated)
    return (
      <main className="login">
        <section className="card">
          <div className="icon-box">
            <ShieldCheck />
          </div>
          <h1>Coordinación del Rectorado</h1>
          <p className="muted">
            Accede para revisar los registros y preparar la ficha de inscripción
            final.
          </p>
          <form onSubmit={login}>
            <Field label="Correo de coordinación">
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@undc.edu.pe"
              />
            </Field>
            <Field
              label="Clave de coordinación"
              hint="Ingresa tu clave de 10 caracteres."
            >
              <input
                type="password"
                minLength={10}
                maxLength={10}
                required
                value={key}
                onChange={(e) => setKey(e.target.value)}
                autoComplete="current-password"
              />
            </Field>
            {error && (
              <p className="alert" role="alert">
                {error}
              </p>
            )}
            <button disabled={busy} className="primary">
              {busy ? "Verificando…" : "Ingresar"} <ArrowRight size={16} />
            </button>
          </form>
        </section>
      </main>
    );
  const visible = people.filter((p) =>
    `${p.firstName} ${p.lastName} ${p.dependency} ${p.dni}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const used = new Set(pairs.flat());
  return (
    <main>
      <div className="admin-title">
        <div>
          <span className="eyebrow">COORDINACIÓN · RECTORADO</span>
          <h1>La delegación, en un solo lugar.</h1>
          <p className="muted">
            Revisa los participantes y prepara la inscripción ante la comisión.
          </p>
        </div>
        <button
          className="secondary"
          onClick={() => {
            setAuthenticated(false);
            setKey("");
            setEmail("");
            setPeople([]);
            setData(initial);
            setPairs([]);
            setState(null);
          }}
        >
          <LogOut size={16} />
          Salir
        </button>
      </div>
      <div className="stats">
        <div className="card">
          <Users />
          <strong>{people.length}</strong>
          <span>Personas registradas</span>
        </div>
        <div className="card">
          <LayoutDashboard />
          <strong>
            {
              new Set(
                people.map((p) => p.dependency.trim().toLocaleLowerCase()),
              ).size
            }
          </strong>
          <span>Dependencias</span>
        </div>
        <div className="card">
          <Music2 />
          <strong>
            {state?.finalizedAt ? "Consolidada" : "En preparación"}
          </strong>
          <span>Delegación del Rectorado</span>
        </div>
      </div>
      <div className="tabs">
        <button
          className={tab === "people" ? "active" : ""}
          onClick={() => setTab("people")}
        >
          Participantes
        </button>
        <button
          className={tab === "sheet" ? "active" : ""}
          onClick={() => setTab("sheet")}
        >
          Ficha de inscripción
        </button>
      </div>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      {tab === "people" ? (
        <section className="card">
          <div className="toolbar">
            <h2>Consolidado de participantes</h2>
            <button
              className="secondary"
              onClick={() => {
                setError("");
                load().catch((e) => setError(e.message));
              }}
            >
              Actualizar
            </button>
            <button className="primary" disabled={!people.length} onClick={csv}>
              <Download size={16} />
              Exportar CSV
            </button>
          </div>
          <div className="search">
            <Search size={18} />
            <input
              aria-label="Buscar participantes"
              placeholder="Buscar por nombre, DNI o dependencia…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>N.°</th>
                  <th>Participante</th>
                  <th>DNI</th>
                  <th>Dependencia</th>
                  <th>Celular</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p, i) => (
                  <tr key={p.id}>
                    <td>{i + 1}</td>
                    <td>
                      <strong>
                        {p.lastName}, {p.firstName}
                      </strong>
                    </td>
                    <td>{p.dni}</td>
                    <td>{p.dependency}</td>
                    <td>{p.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visible.length && (
              <div className="empty">
                <Users />
                <h3>
                  {people.length
                    ? "No hay coincidencias"
                    : "Aún no hay participantes"}
                </h3>
                <p>Los registros recibidos aparecerán en este consolidado.</p>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="card sheet">
          {testMode && (
            <p className="form-notice">
              Modo de prueba activo: puedes consolidar desde una pareja
              completa. La ficha generada no tiene validez oficial.
            </p>
          )}
          <div className="toolbar">
            <div>
              <h2>Ficha final · Rectorado</h2>
              <p className="muted">
                Una representación y una modalidad para toda la delegación.
              </p>
            </div>
            {state?.finalizedAt && (
              <button className="primary" disabled={busy} onClick={openPreview}>
                <FileText size={16} />
                {busy ? "Preparando ficha…" : "Vista previa de ficha"}
              </button>
            )}
          </div>
          {state?.finalizedAt && (
            <div className="form-notice">
              <Check size={18} />
              Delegación consolidada. Descarga la ficha, reúne la firma del
              representante y preséntala ante la comisión organizadora.
            </div>
          )}
          <fieldset disabled={!!state?.finalizedAt || busy}>
            <div className="form-grid">
              <Field label="Modalidad">
                <select
                  value={data.modality}
                  onChange={(e) =>
                    setData({
                      ...data,
                      modality: e.target.value as Delegation["modality"],
                    })
                  }
                >
                  <option value="AFROPERUANA">Danza afroperuana</option>
                  <option value="FOLCLORICA">Danza folclórica</option>
                </select>
              </Field>
              <Field label="Nombre de la danza">
                <input
                  maxLength={150}
                  value={data.dance}
                  onChange={(e) => setData({ ...data, dance: e.target.value })}
                />
              </Field>
              <Field
                label="Duración: minutos"
                hint={
                  data.modality === "AFROPERUANA"
                    ? "De 7 a 10 minutos."
                    : "De 8 a 12 minutos."
                }
              >
                <input
                  type="number"
                  min={0}
                  max={12}
                  value={data.minutes}
                  onChange={(e) =>
                    setData({ ...data, minutes: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Duración: segundos">
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={data.seconds}
                  onChange={(e) =>
                    setData({ ...data, seconds: Number(e.target.value) })
                  }
                />
              </Field>
              <div className="full">
                <Field label="Representante: nombres y apellidos completos">
                  <input
                    maxLength={150}
                    value={data.representative}
                    onChange={(e) =>
                      setData({ ...data, representative: e.target.value })
                    }
                  />
                </Field>
              </div>
              <Field label="DNI del representante">
                <input
                  inputMode="numeric"
                  maxLength={8}
                  value={data.dni}
                  onChange={(e) =>
                    setData({ ...data, dni: e.target.value.replace(/\D/g, "") })
                  }
                />
              </Field>
              <Field label="Celular del representante">
                <input
                  inputMode="numeric"
                  maxLength={9}
                  value={data.phone}
                  onChange={(e) =>
                    setData({
                      ...data,
                      phone: e.target.value.replace(/\D/g, ""),
                    })
                  }
                />
              </Field>
              <div className="full">
                <Field label="Reseña de la danza">
                  <textarea
                    rows={5}
                    maxLength={5000}
                    value={data.review}
                    onChange={(e) =>
                      setData({ ...data, review: e.target.value })
                    }
                  />
                </Field>
              </div>
            </div>
            <div className="toolbar pair-heading">
              <div>
                <h3>Conformación de parejas</h3>
                <p className="muted">
                  Mínimo{" "}
                  {testMode ? "1 pareja completa" : "10 parejas completas"}.
                  Cada persona puede aparecer una sola vez.
                </p>
              </div>
              <button
                className="secondary"
                type="button"
                onClick={() => setPairs([...pairs, [0, 0]])}
              >
                <Plus size={16} />
                Añadir pareja
              </button>
            </div>
            {pairs.map((pair, i) => (
              <div className="pair" key={i}>
                <b>{String(i + 1).padStart(2, "0")}</b>
                {pair.map((id, j) => (
                  <select
                    key={j}
                    aria-label={`Pareja ${i + 1}, integrante ${j + 1}`}
                    value={id}
                    onChange={(e) =>
                      setPairs(
                        pairs.map((p, k) =>
                          k === i
                            ? (p.map((v, n) =>
                                n === j ? Number(e.target.value) : v,
                              ) as [number, number])
                            : p,
                        ),
                      )
                    }
                  >
                    <option value={0}>Selecciona integrante {j + 1}</option>
                    {people
                      .filter((p) => p.id === id || !used.has(p.id))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.lastName}, {p.firstName} · {p.dni}
                        </option>
                      ))}
                  </select>
                ))}
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Eliminar pareja ${i + 1}`}
                  onClick={() => setPairs(pairs.filter((_, k) => k !== i))}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
            <p className="muted">
              {pairs.filter((p) => p[0] && p[1]).length} parejas completas ·{" "}
              {people.length - used.size + (used.has(0) ? 1 : 0)} participantes
              sin asignar
            </p>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={data.acceptedBases}
                onChange={(e) =>
                  setData({ ...data, acceptedBases: e.target.checked })
                }
              />
              <span>
                Confirmo la aceptación de las bases y la participación
                obligatoria de la delegación en el pasacalle.
              </span>
            </label>
            {!state?.finalizedAt && (
              <div className="form-actions">
                <span>
                  El cierre bloquea nuevos registros y fija la nómina final.
                </span>
                <button
                  className="primary"
                  type="button"
                  onClick={() => {
                    const r = createDelegationSchema(testMode).safeParse({
                      ...data,
                      pairs,
                    });
                    if (!r.success) {
                      setError(r.error.issues[0].message);
                      return;
                    }
                    setError("");
                    setConfirm(true);
                  }}
                >
                  Revisar consolidación <ArrowRight size={16} />
                </button>
              </div>
            )}
          </fieldset>
        </section>
      )}
      {previewUrl && (
        <SheetPreview url={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}
      {confirm && (
        <div className="modal-backdrop">
          <section
            className="card modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <h2 id="confirm-title">Consolidar la delegación</h2>
            <p>
              La ficha incluirá {pairs.length * 2} participantes en{" "}
              {pairs.length} parejas para la danza <strong>{data.dance}</strong>
              .
            </p>
            <p>
              Representante: {data.representative}. Se cerrará el registro
              individual y la nómina quedará fijada. Verifica los datos antes de
              continuar.
            </p>
            <div className="form-actions">
              <button
                className="secondary"
                disabled={busy}
                onClick={() => setConfirm(false)}
              >
                Volver a revisar
              </button>
              <button className="primary" disabled={busy} onClick={finalize}>
                {busy ? "Consolidando…" : "Confirmar y consolidar"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
function SheetPreview({ url, onClose }: { url: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  return (
    <dialog
      className="pdf-preview"
      ref={dialog}
      aria-labelledby="sheet-preview-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="pdf-preview-heading">
        <div>
          <h2 id="sheet-preview-title">
            Vista previa de la ficha de inscripción
          </h2>
          <p>
            Revisa el documento antes de descargarlo. El PDF conserva el formato
            del anexo de las bases.
          </p>
        </div>
        <button className="secondary" onClick={onClose} autoFocus>
          Cerrar
        </button>
      </div>
      <PdfPages url={url} />
      <div className="pdf-preview-actions">
        <a className="secondary" href={url} target="_blank" rel="noreferrer">
          Abrir PDF en otra pestaña
        </a>
        <a className="primary" href={url} download="ficha-rectorado-undc.pdf">
          <Download size={16} />
          Descargar ficha PDF
        </a>
      </div>
    </dialog>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
