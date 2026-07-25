"use client";

import { use, useMemo, useState } from "react";
import { Award, Check, Eye, FileText, Printer, QrCode, Users, X } from "lucide-react";
import toast from "react-hot-toast";
import { CertificateDocument } from "@/components/documents/certificate-document";
import { RaceBibDocument } from "@/components/documents/race-bib-document";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { BibTemplateConfig, CertificateTemplateConfig } from "@/lib/templates/template-config";
import { trpc } from "@/lib/trpc";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

type DocumentType = "BIB" | "CERTIFICATE";

const PREVIEW_COUNT = 3;

function EventDocumentsPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const [documentType, setDocumentType] = useState<DocumentType>("BIB");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { data, isLoading, error } = trpc.operational.getEventDocumentBatch.useQuery({ eventId, documentType, page, limit: 50 });
  const printMutation = trpc.operational.recordEventDocumentPrint.useMutation({
    onSuccess: ({ count }) => {
      toast.success(`${count} document${count === 1 ? "" : "s"} recorded and ready to print.`);
      setPreviewOpen(false);
      window.print();
    },
    onError: (mutationError) => toast.error(mutationError.message || "Unable to prepare the selected documents."),
  });

  const selectedItems = useMemo(() => data?.items.filter((item) => selectedIds.includes(item.id)) ?? [], [data?.items, selectedIds]);
  const selectedVisibleCount = selectedItems.length;
  const previewItems = useMemo(() => selectedItems.slice(0, PREVIEW_COUNT), [selectedItems]);

  const changeDocumentType = (nextType: DocumentType) => {
    setDocumentType(nextType);
    setPage(1);
    setSelectedIds([]);
  };
  const toggleOne = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((currentId) => currentId !== id) : [...current, id]);
  const selectVisible = () => setSelectedIds(data?.items.map((item) => item.id) ?? []);
  const openPreview = () => {
    if (selectedItems.length === 0) {
      toast.error("Select at least one document to print.");
      return;
    }
    setPreviewOpen(true);
  };
  const confirmPrint = () => {
    if (selectedItems.length === 0) return;
    printMutation.mutate({ eventId, documentType, registrationIds: selectedItems.map((item) => item.id) });
  };

  return (
    <div className="space-y-6 print:space-y-0">
      <Card className="print:hidden rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary-600 dark:text-primary-400">Document studio</p>
            <h2 className="mt-1 text-xl font-black text-neutral-900 dark:text-neutral-50">Prepare race documents</h2>
            <p className="mt-1 max-w-2xl text-sm text-neutral-500">Choose up to 50 records at a time, review the live documents, then use your browser&apos;s print or Save as PDF destination.</p>
          </div>
          <div className="flex rounded-xl border border-neutral-200 p-1 dark:border-neutral-700">
            <button type="button" onClick={() => changeDocumentType("BIB")} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${documentType === "BIB" ? "bg-primary-500 text-white" : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"}`}><QrCode className="h-4 w-4" />Race bibs</button>
            <button type="button" onClick={() => changeDocumentType("CERTIFICATE")} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${documentType === "CERTIFICATE" ? "bg-primary-500 text-white" : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"}`}><Award className="h-4 w-4" />Certificates</button>
          </div>
        </div>
      </Card>

      {isLoading ? <Skeleton className="h-72 print:hidden" aria-label="Loading documents" /> : error || !data ? (
        <Card className="print:hidden rounded-2xl border border-error-500/30 p-6 text-sm text-error-700 dark:text-error-300">{error?.message ?? "Document records could not be loaded."}</Card>
      ) : (
        <>
          <Card className="print:hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3"><span className="rounded-xl bg-primary-500/10 p-2.5 text-primary-600 dark:text-primary-400"><Users className="h-5 w-5" /></span><div><p className="font-bold text-neutral-900 dark:text-neutral-50">{data.totalCount} eligible record{data.totalCount === 1 ? "" : "s"}</p><p className="text-xs text-neutral-500">{documentType === "BIB" ? "Active registrations with their assigned bib state." : "Confirmed finishers from this completed event."}</p></div></div>
              <div className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" size="sm" onClick={selectVisible} disabled={data.items.length === 0}>Select visible</Button><Button type="button" variant="ghost" size="sm" onClick={() => setSelectedIds([])} disabled={selectedIds.length === 0}>Clear</Button><Button type="button" onClick={openPreview} disabled={printMutation.isPending || selectedVisibleCount === 0} className="gap-2 font-bold"><Eye className="h-4 w-4" />{`Preview ${selectedVisibleCount || "selected"}`}</Button></div>
            </div>
          </Card>

          {data.items.length === 0 ? <EmptyState icon={FileText} title="No eligible documents" description={documentType === "CERTIFICATE" ? "Confirm finisher status before preparing certificates." : "Registrations will appear here once available."} className="print:hidden" /> : (
            <>
              <div data-testid="documents-mobile-list" className="space-y-3 md:hidden print:hidden">
                {data.items.map((item) => {
                  const selected = selectedIds.includes(item.id);
                  return (
                    <article key={item.id} className={`rounded-xl border p-4 ${selected ? "border-primary-400 bg-primary-50/60 dark:bg-primary-950/20" : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"}`}>
                      <div className="flex min-w-0 items-start gap-3">
                        <button type="button" aria-label={`Select ${item.participantName}`} aria-pressed={selected} onClick={() => toggleOne(item.id)} className={`flex size-11 shrink-0 items-center justify-center rounded-lg border ${selected ? "border-primary-500 bg-primary-500 text-white" : "border-neutral-300 text-transparent dark:border-neutral-600"}`}><Check className="h-4 w-4" /></button>
                        <div className="min-w-0 flex-1"><h3 className="overflow-wrap-anywhere font-bold text-neutral-900 dark:text-neutral-50">{item.participantName}</h3><p className="mt-1 text-xs text-neutral-500">{item.categoryName} · {item.distance}KM</p></div>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-neutral-100 pt-3 text-xs dark:border-neutral-800"><div><dt className="text-neutral-500">Bib</dt><dd className="mt-0.5 font-mono font-bold text-primary-600 dark:text-primary-400">{item.bibNumber || "Pending"}</dd></div><div className="min-w-0 text-right"><dt className="text-neutral-500">Registration</dt><dd className="mt-0.5 truncate font-mono">{item.registrationCode}</dd></div></dl>
                    </article>
                  );
                })}
              </div>
              <div data-testid="documents-desktop-table" role="region" aria-label="Participant documents, scroll horizontally for all columns" tabIndex={0} className="dashboard-scroll-region hidden rounded-2xl border border-neutral-200 bg-white outline-none focus-visible:ring-2 focus-visible:ring-primary-500 md:block dark:border-neutral-800 dark:bg-neutral-900 print:hidden">
                <table className="min-w-[42rem] w-full text-left text-sm"><thead><tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-bold uppercase text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900"><th scope="col" className="w-12 px-4 py-3"><span className="sr-only">Select</span></th><th scope="col" className="px-4 py-3">Participant</th><th scope="col" className="px-4 py-3">Category</th><th scope="col" className="px-4 py-3">Bib</th><th scope="col" className="px-4 py-3">Registration</th></tr></thead><tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">{data.items.map((item) => { const selected = selectedIds.includes(item.id); return <tr key={item.id} className={selected ? "bg-primary-50/60 dark:bg-primary-950/20" : ""}><td className="px-4 py-3"><button type="button" aria-label={`Select ${item.participantName}`} onClick={() => toggleOne(item.id)} className={`flex h-11 w-11 items-center justify-center rounded border ${selected ? "border-primary-500 bg-primary-500 text-white" : "border-neutral-300 text-transparent dark:border-neutral-600"}`}><Check className="h-3.5 w-3.5" /></button></td><td className="px-4 py-3 font-bold text-neutral-900 dark:text-neutral-50">{item.participantName}</td><td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{item.categoryName} · {item.distance}KM</td><td className="px-4 py-3 font-mono font-bold text-primary-600 dark:text-primary-400">{item.bibNumber || "Pending"}</td><td className="px-4 py-3 font-mono text-xs text-neutral-500">{item.registrationCode}</td></tr>; })}</tbody></table>
              </div>
              {data.pageCount > 1 && <div className="print:hidden flex items-center justify-end gap-2"><Button type="button" variant="outline" size="sm" disabled={page === 1} onClick={() => { setPage((current) => current - 1); setSelectedIds([]); }}>Previous</Button><span className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">Page {page} of {data.pageCount}</span><Button type="button" variant="outline" size="sm" disabled={page === data.pageCount} onClick={() => { setPage((current) => current + 1); setSelectedIds([]); }}>Next</Button></div>}
            </>
          )}

          {selectedItems.length > 0 && <section aria-label="Selected print documents" className="space-y-8 print:space-y-0">{selectedItems.map((item) => documentType === "BIB" ? <RaceBibDocument key={item.id} template={data.template as BibTemplateConfig} event={data.event} registration={item} verificationUrl={`/verify/registration/${item.registrationCode}`} className="mx-auto" /> : <CertificateDocument key={item.id} template={data.template as CertificateTemplateConfig} event={data.event} registration={item} verificationUrl={`/verify/certificate/${item.registrationCode}`} className="mx-auto" />)}</section>}

          {previewOpen && data && (
            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-3 sm:p-4 print:hidden" onClick={() => setPreviewOpen(false)}>
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="document-preview-title"
                className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-neutral-900"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
                  <div>
                    <h3 id="document-preview-title" className="text-base font-bold text-neutral-900 dark:text-neutral-50">
                      Preview {documentType === "BIB" ? "race bibs" : "certificates"}
                    </h3>
                    <p className="mt-0.5 text-sm text-neutral-500">
                      Showing {previewItems.length} of {selectedVisibleCount} selected document{selectedVisibleCount === 1 ? "" : "s"}. Confirm the template before printing all.
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setPreviewOpen(false)} aria-label="Close preview">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto bg-neutral-50 px-6 py-6 dark:bg-neutral-950">
                  <div className="space-y-8">
                    {previewItems.map((item) => documentType === "BIB" ? (
                      <RaceBibDocument key={item.id} template={data.template as BibTemplateConfig} event={data.event} registration={item} verificationUrl={`/verify/registration/${item.registrationCode}`} className="mx-auto" />
                    ) : (
                      <CertificateDocument key={item.id} template={data.template as CertificateTemplateConfig} event={data.event} registration={item} verificationUrl={`/verify/certificate/${item.registrationCode}`} className="mx-auto" />
                    ))}
                  </div>
                </div>
                <div className="flex flex-col-reverse gap-3 border-t border-neutral-200 px-6 py-4 sm:flex-row sm:justify-end dark:border-neutral-800">
                  <Button type="button" variant="ghost" onClick={() => setPreviewOpen(false)} disabled={printMutation.isPending}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={confirmPrint} disabled={printMutation.isPending} className="gap-2 font-bold">
                    <Printer className="h-4 w-4" />
                    {printMutation.isPending ? "Preparing..." : `Looks good, print all ${selectedVisibleCount}`}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function EventDocumentsPage(props: { params: Promise<{ id: string }> }) {
  return (
    <ErrorBoundary>
      <EventDocumentsPageContent {...props} />
    </ErrorBoundary>
  );
}
