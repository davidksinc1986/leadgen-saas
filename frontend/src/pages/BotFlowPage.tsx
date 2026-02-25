import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

type Condition = {
 path: string;
 op: "equals" | "notEquals" | "contains" | "in" | "gt" | "gte" | "lt" | "lte" | "exists" | "regex";
 value?: any;
};

type Option = { key: string; label: string; value: string };

type Question = {
 id: string;
 type: "choice" | "text" | "number";
 prompt: string;
 required?: boolean;
 saveTo: string;
 options?: Option[];
 showIf?: Condition[];
 next?: {
   defaultNextId?: string | null;
   rules?: Array<{ conditions: Condition[]; nextId: string }>;
 };
};

type BotFlow = {
 questions?: Question[];
 finalMessage?: string;
};

function pretty(obj: any) {
 return JSON.stringify(obj, null, 2);
}

export default function BotFlowPage() {
 const [botFlow, setBotFlow] = useState<BotFlow | null>();
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>();

 const [draftJson, setDraftJson] = useState<string>(() =>
   pretty({
     id: "q_interes",
     type: "choice",
     prompt: "¿Qué tipo de propiedad buscas?\n1 Casa\n2 Apartamento\n3 Lote\n4 Comercial",
     saveTo: "interes",
     required: true,
     options: [
       { key: "1", label: "Casa", value: "Casa" },
       { key: "2", label: "Apartamento", value: "Apartamento" },
       { key: "3", label: "Lote", value: "Lote" },
       { key: "4", label: "Comercial", value: "Comercial" }
     ],
     next: {
       defaultNextId: "q_presupuesto",
       rules: [
         {
           conditions: [{ path: "answers.q_interes.value", op: "equals", value: "Comercial" }],
           nextId: "q_ubicacion"
         }
       ]
     }
   })
 );

 const questions = useMemo(() => botFlow?.questions ?? [], [botFlow]);

 async function load() {
   setLoading(true);
   setError(null);
   try {
     const resp = await api.get("/company/me/bot-flow");
     setBotFlow(resp.data?.botFlow ?? null);
   } catch (e: any) {
     setError(e?.response?.data?.error ?? "No se pudo cargar bot flow");
   } finally {
     setLoading(false);
   }
 }

 async function addQuestion() {
   setError(null);
   try {
     const q = JSON.parse(draftJson);
     const resp = await api.post("/company/me/bot-flow/questions", { question: q });
     setBotFlow((prev) => ({ ...(prev ?? {}), questions: resp.data?.questions ?? [] }));
   } catch (e: any) {
     const msg = e?.response?.data?.details?.join?.("\n") ?? e?.response?.data?.error ?? e?.message ?? "Error creando pregunta";
     setError(msg);
   }
 }

 async function updateQuestion(id: string) {
   setError(null);
   try {
     const q = JSON.parse(draftJson);
     const { id: _ignore, ...patch } = q;
     const resp = await api.patch(`/company/me/bot-flow/questions/${encodeURIComponent(id)}`, patch);
     setBotFlow((prev) => ({ ...(prev ?? {}), questions: resp.data?.questions ?? [] }));
   } catch (e: any) {
     const msg = e?.response?.data?.details?.join?.("\n") ?? e?.response?.data?.error ?? e?.message ?? "Error actualizando pregunta";
     setError(msg);
   }
 }

 async function delQuestion(id: string) {
   if (!confirm(`Eliminar ${id}?`)) return;
   setError(null);
   try {
     const resp = await api.delete(`/company/me/bot-flow/questions/${encodeURIComponent(id)}`);
     setBotFlow((prev) => ({ ...(prev ?? {}), questions: resp.data?.questions ?? [] }));
   } catch (e: any) {
     setError(e?.response?.data?.error ?? "Error eliminando pregunta");
   }
 }

 async function move(id: string, toIndex: number) {
   setError(null);
   try {
     const resp = await api.post(`/company/me/bot-flow/questions/${encodeURIComponent(id)}/move`, { toIndex });
     setBotFlow((prev) => ({ ...(prev ?? {}), questions: resp.data?.questions ?? [] }));
   } catch (e: any) {
     setError(e?.response?.data?.error ?? "Error moviendo pregunta");
   }
 }

 function loadIntoEditor(q: Question) {
   setDraftJson(pretty(q));
 }

 // ---- Preview ----
 const [previewStep, setPreviewStep] = useState<string>("idle");
 const [previewData, setPreviewData] = useState<any>({});
 const [previewInput, setPreviewInput] = useState<string>("Quiero información");
 const [previewLog, setPreviewLog] = useState<Array<{ from: "user" | "bot"; text: string }>>([]);

 async function previewSend() {
   setError(null);
   try {
     const resp = await api.post("/company/me/bot-flow/preview", {
       step: previewStep,
       data: previewData,
       text: previewInput
     });

     const result = resp.data?.result;
     const mergedData = resp.data?.mergedData;

     setPreviewLog((prev) => [...prev, { from: "user", text: previewInput }]);

     if (result?.type === "reply") {
       setPreviewLog((prev) => [...prev, { from: "bot", text: result.text }]);
       setPreviewStep(result.nextStep ?? previewStep);
       setPreviewData(mergedData ?? previewData);
     }
     setPreviewInput("");
   } catch (e: any) {
     setError(e?.response?.data?.error ?? e?.message ?? "Error en preview");
   }
 }

 function previewReset() {
   setPreviewStep("idle");
   setPreviewData({});
   setPreviewLog([]);
   setPreviewInput("Quiero información");
 }

 useEffect(() => {
   load();
 }, []);

 return (
   <div style={{ padding: 20, fontFamily: "system-ui" }}>
     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
       <h2>Bot Flow</h2>
       <button onClick={load} disabled={loading}>
         Refrescar
       </button>
     </div>

     <p style={{ color: "#555" }}>
       CRUD de preguntas + Preview. Si <b>questions</b> tiene elementos, el bot usa el builder (q:...).
     </p>

     {error && <div style={{ color: "crimson", whiteSpace: "pre-wrap", marginBottom: 12 }}>{error}</div>}

     <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
       <div>
         <h3>Preguntas ({questions.length})</h3>

         <div style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
           <table width="100%" cellPadding={10} style={{ borderCollapse: "collapse" }}>
             <thead>
               <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                 <th>#</th>
                 <th>ID</th>
                 <th>Tipo</th>
                 <th>saveTo</th>
                 <th>Orden</th>
                 <th>Acciones</th>
               </tr>
             </thead>
             <tbody>
               {questions.map((q, idx) => (
                 <tr key={q.id} style={{ borderBottom: "1px solid #f3f3f3" }}>
                   <td>{idx}</td>
                   <td style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{q.id}</td>
                   <td>{q.type}</td>
                   <td>{q.saveTo}</td>
                   <td style={{ display: "flex", gap: 6 }}>
                     <button disabled={idx === 0} onClick={() => move(q.id, idx - 1)}>
                       ↑
                     </button>
                     <button disabled={idx === questions.length - 1} onClick={() => move(q.id, idx + 1)}>
                       ↓
                     </button>
                   </td>
                   <td style={{ display: "flex", gap: 8 }}>
                     <button onClick={() => loadIntoEditor(q)}>Editar</button>
                     <button onClick={() => delQuestion(q.id)}>Eliminar</button>
                   </td>
                 </tr>
               ))}
               {!questions.length && (
                 <tr>
                   <td colSpan={6} style={{ color: "#666" }}>
                     No hay preguntas aún.
                   </td>
                 </tr>
               )}
             </tbody>
           </table>
         </div>

         <div style={{ marginTop: 12 }}>
           <h4>Final message</h4>
           <textarea
             value={botFlow?.finalMessage ?? ""}
             onChange={(e) => setBotFlow((prev) => ({ ...(prev ?? {}), finalMessage: e.target.value }))}
             rows={3}
             style={{ width: "100%", padding: 10 }}
           />
           <button
             onClick={async () => {
               try {
                 const resp = await api.patch("/company/me/bot-flow", { finalMessage: botFlow?.finalMessage ?? "" });
                 setBotFlow(resp.data?.botFlow ?? botFlow);
               } catch (e: any) {
                 setError(e?.response?.data?.error ?? "Error guardando finalMessage");
               }
             }}
           >
             Guardar finalMessage
           </button>
         </div>

         <div style={{ marginTop: 18 }}>
           <h3>Preview</h3>
           <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
             <button onClick={previewReset}>Reset</button>
             <div style={{ color: "#666" }}>
               <b>step:</b> {previewStep}
             </div>
           </div>

           <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10, minHeight: 140, background: "#fff" }}>
             {previewLog.length === 0 ? (
               <div style={{ color: "#666" }}>Envía un mensaje para probar el flujo.</div>
             ) : (
               previewLog.map((m, i) => (
                 <div key={i} style={{ marginBottom: 8 }}>
                   <b>{m.from === "user" ? "Tú" : "Bot"}:</b>{" "}
                   <span style={{ whiteSpace: "pre-wrap" }}>{m.text}</span>
                 </div>
               ))
             )}
           </div>

           <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
             <input
               value={previewInput}
               onChange={(e) => setPreviewInput(e.target.value)}
               placeholder="Escribe aquí..."
               style={{ flex: 1, padding: 10 }}
               onKeyDown={(e) => {
                 if (e.key === "Enter") previewSend();
               }}
             />
             <button onClick={previewSend} disabled={!previewInput.trim()}>
               Enviar
             </button>
           </div>

           <details style={{ marginTop: 10 }}>
             <summary>Ver previewData (debug)</summary>
             <pre style={{ whiteSpace: "pre-wrap" }}>{pretty(previewData)}</pre>
           </details>
         </div>
       </div>

       <div>
         <h3>Editor (JSON)</h3>
         <p style={{ color: "#555", marginTop: 0 }}>
           Crea con <b>POST</b> (id nuevo). Actualiza con <b>PATCH</b> (id existente). IDs recomendados: <b>q_interes</b>.
         </p>

         <textarea
           value={draftJson}
           onChange={(e) => setDraftJson(e.target.value)}
           rows={26}
           style={{ width: "100%", padding: 10, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
         />

         <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
           <button onClick={addQuestion}>Crear (POST)</button>
           <button
             onClick={() => {
               try {
                 const q = JSON.parse(draftJson);
                 if (!q?.id) return setError("El JSON debe incluir id (ej: q_interes) para actualizar");
                 updateQuestion(String(q.id));
               } catch (e: any) {
                 setError(e?.message ?? "JSON inválido");
               }
             }}
           >
             Actualizar por id (PATCH)
           </button>
         </div>
       </div>
     </div>
   </div>
 );
}