import React, { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  ClipboardCheck, 
  Building2, 
  User, 
  PenTool, 
  FileText, 
  Send, 
  CheckCircle2, 
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { motion, AnimatePresence } from 'motion/react';
import { format, addDays } from 'date-fns';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { cn } from './utils';
import { InspectionData, IRREGULARITIES_LIST, INSPECTOR_RANKS, OCCUPATIONS_LIST, GBM_OPTIONS, GBM_FOOTERS } from './types';

export default function App() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customIrregularity, setCustomIrregularity] = useState('');
  
  const [isOccupationDropdownOpen, setIsOccupationDropdownOpen] = useState(false);
  
  const [formData, setFormData] = useState<Partial<InspectionData>>({
    date: new Date().toISOString(),
    type: 'NOTIFICAÇÃO',
    unit: GBM_OPTIONS[0],
    preNumber: '',
    notificationNumber: '',
    deadlineDays: 30,
    company: { name: '', cnpj: '', street: '', number: '', neighborhood: '', city: '', complement: '', address: '', phone: '', occupation: [], pscip: '', pscipStatus: '', area: '', accompaniedBy: '', accompaniedByCPF: '', accompaniedByFunction: '' },
    irregularities: [],
    responsible: { name: '', email: '@', cpf: '' },
    inspectors: [{ name: '', rank: '', registration: '' }],
    signatures: { responsible: '', inspectors: [] }
  });

  const responsibleSigRef = useRef<SignatureCanvas>(null);
  const inspectorSigRefs = useRef<(SignatureCanvas | null)[]>([]);
  const pdfHeaderRef = useRef<HTMLDivElement>(null);
  const pdfBodyRef = useRef<HTMLDivElement>(null);

  const maskCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatDateInPortuguese = () => {
    const date = new Date();
    const day = date.getDate().toString().padStart(2, '0');
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} de ${month} de ${year}`;
  };

  const maskCNPJ = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const maskNotification = (value: string) => {
    if (!value) return '';
    
    let val = value.replace(/NÃO/gi, 'NOT');
    
    const current = formData.notificationNumber || '';
    const isDeleting = val.length < current.length;
    if (isDeleting) return val;

    if (val.endsWith('/') && !val.includes('/NOT/')) {
      return val.slice(0, -1) + '/NOT/';
    }

    if (val.endsWith('.') && val.includes('/NOT/') && !val.includes('/PRE')) {
      const pre = formData.preNumber || '____';
      return val.slice(0, -1) + '.' + pre + '/PRE';
    }

    return val;
  };

  const maskCPFOrCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 11) {
      return maskCPF(value);
    }
    return maskCNPJ(value);
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateNestedField = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...(prev[parent as keyof InspectionData] as any), [field]: value }
    }));
  };

  const toggleIrregularity = (item: string) => {
    setFormData(prev => {
      const current = prev.irregularities || [];
      if (current.includes(item)) {
        return { ...prev, irregularities: current.filter(i => i !== item) };
      }
      return { ...prev, irregularities: [...current, item] };
    });
  };

  const addCustomIrregularity = () => {
    if (customIrregularity.trim()) {
      const item = customIrregularity.trim();
      setFormData(prev => {
        const current = prev.irregularities || [];
        if (current.includes(item)) return prev;
        return { ...prev, irregularities: [...current, item] };
      });
      setCustomIrregularity('');
    }
  };

  const handleNext = () => {
    setError(null);
    
    if (step === 2 && customIrregularity.trim()) {
      addCustomIrregularity();
    }
    
    if (step === 1) {
      if (!formData.preNumber) {
        setError('Por favor, informe o número do PRE.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (!formData.notificationNumber) {
        setError('Por favor, informe o número da notificação.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (!formData.company?.name) {
        setError('Por favor, informe a Razão Social da empresa.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    if (step === 2) {
      if (!formData.irregularities || formData.irregularities.length === 0) {
        setError('Por favor, selecione ao menos uma irregularidade.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    if (step === 3) {
      const email = formData.responsible?.email || '';
      if (!formData.responsible?.name) {
        setError('Por favor, informe o nome do responsável.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (email === '@' || !email.includes('.') || email.length < 5) {
        setError('Por favor, informe um e-mail válido para o responsável.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (!formData.responsible?.cpf) {
        setError('Por favor, informe o CPF do responsável.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      
      // Validate inspectors
      for (let i = 0; i < (formData.inspectors?.length || 0); i++) {
        const inspector = formData.inspectors![i];
        if (!inspector.name || !inspector.rank || !inspector.registration) {
          setError(`Por favor, preencha todos os dados do Vistoriante ${i + 1}.`);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }
    }

    setStep(prev => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleBack = () => {
    setError(null);
    setStep(prev => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveResponsibleSignature = () => {
    if (responsibleSigRef.current && !responsibleSigRef.current.isEmpty()) {
      setFormData(prev => ({
        ...prev,
        signatures: {
          ...prev.signatures!,
          responsible: responsibleSigRef.current?.toDataURL() || ''
        }
      }));
      handleNext();
    } else {
      setError('Por favor, assine no campo indicado.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const saveInspectorSignatures = () => {
    const inspectorSigs = formData.inspectors.map((_, index) => {
      const ref = inspectorSigRefs.current[index];
      return ref && !ref.isEmpty() ? ref.toDataURL() : '';
    });

    if (inspectorSigs.some(sig => !sig)) {
      setError('Por favor, todos os vistoriantes devem assinar.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setFormData(prev => ({
      ...prev,
      signatures: {
        ...prev.signatures!,
        inspectors: inspectorSigs
      }
    }));
    handleNext();
  };

  const generatePDF = async () => {
    if (!pdfHeaderRef.current || !pdfBodyRef.current) {
      console.error('PDF refs not found');
      setError('Erro interno: Referências do PDF não encontradas.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    // Ensure we are at the top for html2canvas
    window.scrollTo(0, 0);
    
    // Small delay to ensure DOM is fully updated
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const bottomMargin = 20;
      const sidePadding = 12;
      
      // 1. Capture Header
      console.log('Capturing header...');
      const headerCanvas = await html2canvas(pdfHeaderRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: true,
        allowTaint: true
      });
      const headerImgData = headerCanvas.toDataURL('image/png');
      const headerWidth = pageWidth;
      const headerHeight = (headerCanvas.height * headerWidth) / headerCanvas.width;
      
      let currentY = headerHeight;
      let currentPage = 1;

      const addHeaderAndPageNumber = (pageNum: number) => {
        pdf.addImage(headerImgData, 'PNG', 0, 0, headerWidth, headerHeight);
      };

      // Helper to add a section to the PDF
      const addSection = async (elementId: string) => {
        console.log(`Adding section: ${elementId}`);
        const element = document.getElementById(elementId);
        if (!element) {
          console.warn(`Element ${elementId} not found`);
          return null;
        }
        
        const canvas = await html2canvas(element, { 
          scale: 2, 
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          allowTaint: true
        });
        const imgWidth = pageWidth - (sidePadding * 2);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Use a 5mm buffer to be safe with margins
        if (currentY + imgHeight > pageHeight - bottomMargin - 5) {
          pdf.addPage();
          currentPage++;
          currentY = headerHeight;
          addHeaderAndPageNumber(currentPage);
        }
        
        const startY = currentY;
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', sidePadding, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 6; // Spacing between sections
        return { startY, height: imgHeight, page: currentPage };
      };

      // Special handling for irregularities to avoid cutting text
      const addIrregularities = async () => {
        const container = document.getElementById('pdf-section-irregularities');
        if (!container) return;

        // Add the title of the section first
        const titleElement = container.querySelector('.bg-stone-800') || container.querySelector('.bg-black');
        if (titleElement) {
          const canvas = await html2canvas(titleElement as HTMLElement, { 
            scale: 2, 
            backgroundColor: '#ffffff',
            useCORS: true,
            allowTaint: true
          });
          const imgWidth = pageWidth - (sidePadding * 2);
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          if (currentY + imgHeight > pageHeight - bottomMargin) {
            pdf.addPage();
            currentPage++;
            currentY = headerHeight;
            addHeaderAndPageNumber(currentPage);
          }
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', sidePadding, currentY, imgWidth, imgHeight);
          currentY += imgHeight;
        }

        const items = Array.from(container.querySelectorAll('.pdf-irregularity-item'));
        console.log(`Found ${items.length} irregularities to add to PDF`);
        
        for (const item of items) {
          // Small delay to ensure rendering
          await new Promise(resolve => setTimeout(resolve, 50));
          
          const canvas = await html2canvas(item as HTMLElement, { 
            scale: 2, 
            backgroundColor: '#ffffff',
            useCORS: true,
            allowTaint: true,
            logging: false
          });
          const imgWidth = pageWidth - (sidePadding * 2);
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          if (currentY + imgHeight > pageHeight - bottomMargin) {
            pdf.addPage();
            currentPage++;
            currentY = headerHeight;
            addHeaderAndPageNumber(currentPage);
          }
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', sidePadding, currentY, imgWidth, imgHeight);
          currentY += imgHeight;
        }
        currentY += 6;
      };

      // Initial page setup
      addHeaderAndPageNumber(1);

      // Add sections in order
      await addSection('pdf-section-data');
      await addSection('pdf-section-deadline');
      await addIrregularities();
      const returnResult = await addSection('pdf-section-return');
      
      // Add clickable link over the return section
      if (returnResult) {
        pdf.setPage(returnResult.page);
        // The URL is roughly in the middle of the block. 
        // We'll add a link to the whole block area for simplicity and reliability.
        pdf.link(sidePadding, returnResult.startY, pageWidth - (sidePadding * 2), returnResult.height, { url: 'https://prevenir.bombeiros.ms.gov.br' });
      }

      await addSection('pdf-section-signatures');

      // Finalize PDF: Add page numbers and unit footer
      const totalPages = currentPage;
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        
        // Add Page Number (e.g. 1/3)
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        // Positioned at the top right header of every page
        pdf.text(`PÁGINA: ${i}/${totalPages}`.toUpperCase(), pageWidth - 16, 20, { align: 'right' });

        // Add Unit Footer only on last page at the very bottom
        if (i === totalPages && formData.unit) {
          const footerText = GBM_FOOTERS[formData.unit]?.toUpperCase();
          if (footerText) {
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(100, 100, 100);
            const splitFooter = pdf.splitTextToSize(footerText, pageWidth - 24);
            // Move footer slightly up to avoid cutting (18mm from bottom)
            const footerY = pageHeight - 18 - (splitFooter.length - 1) * 3;
            pdf.text(splitFooter, pageWidth / 2, footerY, { align: 'center' });
          }
        }
      }
      
      const pdfBase64 = pdf.output('datauristring').split(',')[1];
      
      // Save locally for the user
      // Sanitize filename: remove characters that might cause issues
      const safeNotificationNumber = (formData.notificationNumber || 'S-N').replace(/[^a-zA-Z0-9_-]/g, ' ');
      const safeCompanyName = (formData.company?.name || 'documento').replace(/[^a-zA-Z0-9_-]/g, ' ');
      const fileName = `NOT ${safeNotificationNumber} ${safeCompanyName}`.replace(/_/g, ' ').replace(/\s+/g, ' ').trim() + '.pdf';
      
      try {
        pdf.save(fileName);
      } catch (saveError) {
        console.error('Error saving PDF locally:', saveError);
        // Fallback: try to open in new tab if save fails
        window.open(pdf.output('bloburl'), '_blank');
      }
      
      // Send to server for Email and SMS delivery
      try {
        const response = await fetch('/api/send-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pdfBase64,
            email: formData.responsible?.email,
            phone: formData.company?.phone,
            preNumber: formData.preNumber
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.pdfUrl) {
            setPdfUrl(data.pdfUrl);
          }
          setStep(7); // Success step
        } else {
          const errorData = await response.json();
          console.warn('Server failed to send PDF:', errorData);
          setError(`O PDF foi baixado, mas não pôde ser enviado automaticamente por e-mail/SMS: ${errorData.error || 'Erro no servidor'}.`);
          setStep(7); // Still show success step as the PDF was downloaded
        }
      } catch (apiError) {
        console.error('Error sending PDF to server:', apiError);
        setError(`O PDF foi baixado, mas houve um erro ao tentar enviá-lo automaticamente: ${apiError instanceof Error ? apiError.message : 'Erro de conexão'}.`);
        setStep(7); // Still show success step as the PDF was downloaded
      }
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsSuccess(true);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Ocorreu um erro ao gerar o PDF. Por favor, tente novamente ou verifique se todos os campos estão preenchidos corretamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setIsSuccess(false);
    setIsOccupationDropdownOpen(false);
    setFormData({
      date: new Date().toISOString(),
      type: 'NOTIFICAÇÃO',
      unit: GBM_OPTIONS[0],
      preNumber: '',
      notificationNumber: '',
      deadlineDays: 30,
      company: { name: '', cnpj: '', pscip: '', pscipStatus: '', area: '', street: '', number: '', neighborhood: '', city: '', complement: '', address: '', phone: '', occupation: [], accompaniedBy: '', accompaniedByCPF: '', accompaniedByFunction: '' },
      irregularities: [],
      responsible: { name: '', email: '@', cpf: '' },
      inspectors: [{ name: '', rank: '', registration: '' }],
      signatures: { responsible: '', inspectors: [] }
    });
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans pb-12">
      <header className="bg-red-700 text-white p-6 shadow-md mb-8">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <div className="bg-white p-2 rounded-full">
            <ClipboardCheck className="text-red-700 w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">BOMBEIRO DIGITAL</h1>
            <p className="text-red-100 text-sm font-medium">Sistema de Vistorias Técnicas</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4">
        {!isSuccess && (
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div 
                  key={i}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                    step >= i ? "bg-red-600 text-white" : "bg-stone-200 text-stone-500"
                  )}
                >
                  {i}
                </div>
              ))}
            </div>
            <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-red-600"
                initial={{ width: 0 }}
                animate={{ width: `${(step / 6) * 100}%` }}
              />
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-12 rounded-3xl shadow-xl text-center border border-stone-100"
            >
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-bold mb-4">Vistoria Concluída!</h2>
              <p className="text-stone-600 mb-8 max-w-md mx-auto">
                O documento foi gerado com sucesso e enviado para os e-mails do responsável e do vistoriante.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                {pdfUrl && (
                  <a 
                    href={pdfUrl} 
                    download={`NOT_${(formData.notificationNumber || 'S-N').replace(/[^a-zA-Z0-9_-]/g, '_')}_${(formData.company?.name || 'documento').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-stone-900 hover:bg-stone-800 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
                  >
                    <FileText size={20} /> Baixar PDF Manualmente
                  </a>
                )}
                <button 
                  onClick={resetForm}
                  className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-red-200"
                >
                  Nova Vistoria
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white p-8 rounded-3xl shadow-xl border border-stone-100"
            >
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3 mb-6">
                  <AlertTriangle size={20} className="shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Building2 className="text-red-600" />
                    <h2 className="text-xl font-bold">Dados da Empresa</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Unidade Bombeiro Militar <span className="text-red-500">*</span></label>
                      <select 
                        value={formData.unit}
                        onChange={(e) => updateFormData('unit', e.target.value)}
                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none appearance-none"
                      >
                        {GBM_OPTIONS.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">PRE <span className="text-red-500">*</span></label>
                      <div className="flex items-center">
                        <input 
                          type="text"
                          value={formData.preNumber}
                          onChange={(e) => updateFormData('preNumber', e.target.value.replace(/PRÉ/gi, 'PRE'))}
                          className="flex-1 p-3 bg-stone-50 border border-stone-200 rounded-l-xl focus:ring-2 focus:ring-red-500 outline-none"
                          placeholder="0000"
                        />
                        <span className="bg-stone-200 px-4 py-3 border border-l-0 border-stone-200 rounded-r-xl font-bold text-stone-600">/PRE</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Nº NOTIFICAÇÃO <span className="text-red-500">*</span></label>
                      <input 
                        type="text"
                        value={formData.notificationNumber}
                        onChange={(e) => updateFormData('notificationNumber', maskNotification(e.target.value))}
                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                        placeholder="00000000/NOT/0000000.0000/PRE"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">PRAZO PARA CUMPRIMENTO (DIAS)</label>
                      <select 
                        value={formData.deadlineDays}
                        onChange={(e) => updateFormData('deadlineDays', parseInt(e.target.value))}
                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none appearance-none"
                      >
                        {Array.from({ length: 30 }, (_, i) => i + 1).map(day => (
                          <option key={day} value={day}>{day} Dias</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Nº PSCIP</label>
                      <input 
                        type="text"
                        value={formData.company?.pscip}
                        onChange={(e) => updateNestedField('company', 'pscip', e.target.value)}
                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                        placeholder="Nº do Processo"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Status PSCIP</label>
                      <select 
                        value={formData.company?.pscipStatus}
                        onChange={(e) => updateNestedField('company', 'pscipStatus', e.target.value)}
                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none appearance-none"
                      >
                        <option value="">Selecione...</option>
                        <option value="APROVADO">APROVADO</option>
                        <option value="EM ANÁLISE">EM ANÁLISE</option>
                        <option value="PTS">PTS</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">ÁREA (M²)</label>
                      <input 
                        type="text"
                        value={formData.company?.area}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, '');
                          if (val === '') {
                            updateNestedField('company', 'area', '');
                            return;
                          }
                          const number = parseInt(val, 10) / 100;
                          const formatted = new Intl.NumberFormat('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }).format(number);
                          updateNestedField('company', 'area', formatted);
                        }}
                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                        placeholder="0,00"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Nome / Razão Social <span className="text-red-500">*</span></label>
                      <input 
                        type="text"
                        value={formData.company?.name}
                        onChange={(e) => updateNestedField('company', 'name', e.target.value)}
                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                        placeholder="Ex: Mercado Silva LTDA"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">CNPJ / CPF</label>
                      <input 
                        type="text"
                        value={formData.company?.cnpj}
                        onChange={(e) => updateNestedField('company', 'cnpj', maskCPFOrCNPJ(e.target.value))}
                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Nome de quem acompanhou a vistoria</label>
                      <input 
                        type="text"
                        value={formData.company?.accompaniedBy}
                        onChange={(e) => updateNestedField('company', 'accompaniedBy', e.target.value)}
                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                        placeholder="Nome Completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">CPF de quem acompanhou a vistoria</label>
                      <input 
                        type="text"
                        value={formData.company?.accompaniedByCPF}
                        onChange={(e) => updateNestedField('company', 'accompaniedByCPF', maskCPF(e.target.value))}
                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                        placeholder="000.000.000-00"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Função de quem acompanhou a vistoria</label>
                      <input 
                        type="text"
                        value={formData.company?.accompaniedByFunction}
                        onChange={(e) => updateNestedField('company', 'accompaniedByFunction', e.target.value)}
                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                        placeholder="Ex: Gerente, Proprietário, etc."
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2 relative">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">CLASSIFICAÇÃO DA EDIFICAÇÃO (Selecione uma ou mais)</label>
                      <div 
                        onClick={() => setIsOccupationDropdownOpen(!isOccupationDropdownOpen)}
                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl flex justify-between items-center cursor-pointer hover:border-stone-300 transition-colors"
                      >
                        <span className="text-sm text-stone-600">
                          {formData.company?.occupation && formData.company.occupation.length > 0 
                            ? `${formData.company.occupation.length} selecionada(s)` 
                            : 'Selecione as ocupações...'}
                        </span>
                        <ChevronRight size={20} className={cn("transition-transform", isOccupationDropdownOpen && "rotate-90")} />
                      </div>
                      
                      {isOccupationDropdownOpen && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-stone-200 rounded-xl shadow-xl max-h-64 overflow-y-auto p-2 custom-scrollbar">
                          {OCCUPATIONS_LIST.map(occ => (
                            <label key={occ} className="flex items-center gap-3 p-2.5 hover:bg-stone-50 rounded-lg cursor-pointer transition-colors">
                              <input 
                                type="checkbox"
                                checked={formData.company?.occupation?.includes(occ)}
                                onChange={(e) => {
                                  const current = formData.company?.occupation || [];
                                  const next = e.target.checked 
                                    ? [...current, occ]
                                    : current.filter(o => o !== occ);
                                  updateNestedField('company', 'occupation', next);
                                }}
                                className="w-4 h-4 rounded border-stone-300 text-red-600 focus:ring-red-500"
                              />
                              <span className="text-xs font-medium text-stone-700">{occ}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {formData.company?.occupation && formData.company.occupation.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {formData.company.occupation.map(occ => (
                            <span key={occ} className="px-2.5 py-1 bg-red-50 text-red-700 text-[10px] font-black rounded-full border border-red-100 flex items-center gap-1">
                              {occ.split(' ')[0]}
                              <button 
                                onClick={() => {
                                  const next = formData.company?.occupation?.filter(o => o !== occ);
                                  updateNestedField('company', 'occupation', next);
                                }}
                                className="hover:text-red-900"
                              >
                                <Plus size={10} className="rotate-45" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Logradouro</label>
                      <input 
                        type="text"
                        value={formData.company?.street}
                        onChange={(e) => updateNestedField('company', 'street', e.target.value)}
                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                        placeholder="Rua, Avenida, etc."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Nº</label>
                      <input 
                        type="text"
                        value={formData.company?.number}
                        onChange={(e) => updateNestedField('company', 'number', e.target.value)}
                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                        placeholder="123"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Bairro</label>
                      <input 
                        type="text"
                        value={formData.company?.neighborhood}
                        onChange={(e) => updateNestedField('company', 'neighborhood', e.target.value)}
                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                        placeholder="Centro"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Cidade</label>
                      <input 
                        type="text"
                        value={formData.company?.city}
                        onChange={(e) => updateNestedField('company', 'city', e.target.value)}
                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                        placeholder="Campo Grande"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Complemento</label>
                      <input 
                        type="text"
                        value={formData.company?.complement}
                        onChange={(e) => updateNestedField('company', 'complement', e.target.value)}
                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                        placeholder="Ex: Sala 101, Bloco A"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Telefone de Contato</label>
                      <input 
                        type="text"
                        value={formData.company?.phone}
                        onChange={(e) => updateNestedField('company', 'phone', maskPhone(e.target.value))}
                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <button onClick={handleNext} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all">
                      Próximo <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertTriangle className="text-red-600" />
                    <h2 className="text-xl font-bold">Irregularidades</h2>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Selecione as Irregularidades Encontradas</label>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                      {IRREGULARITIES_LIST.map((item) => (
                        <div 
                          key={item}
                          onClick={() => toggleIrregularity(item)}
                          className={cn(
                            "p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all",
                            formData.irregularities?.includes(item)
                              ? "bg-red-50 border-red-200 text-red-900"
                              : "bg-stone-50 border-stone-100 text-stone-700 hover:border-stone-200"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded flex items-center justify-center border",
                            formData.irregularities?.includes(item) ? "bg-red-600 border-red-600 text-white" : "bg-white border-stone-300"
                          )}>
                            {formData.irregularities?.includes(item) && <CheckCircle2 size={14} />}
                          </div>
                          <span className="text-sm font-medium">{item}</span>
                        </div>
                      ))}
                      {formData.irregularities?.filter(i => !IRREGULARITIES_LIST.includes(i)).map((item) => (
                        <div 
                          key={item}
                          onClick={() => toggleIrregularity(item)}
                          className="p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all bg-red-50 border-red-200 text-red-900"
                        >
                          <div className="w-5 h-5 rounded flex items-center justify-center border bg-red-600 border-red-600 text-white">
                            <CheckCircle2 size={14} />
                          </div>
                          <span className="text-sm font-medium flex-1">{item}</span>
                          <Trash2 size={16} className="text-red-400 hover:text-red-600" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Adicionar Outra Irregularidade</label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={customIrregularity}
                        onChange={(e) => setCustomIrregularity(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addCustomIrregularity()}
                        className="flex-1 p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                        placeholder="Descreva a irregularidade..."
                      />
                      <button onClick={addCustomIrregularity} className="bg-stone-900 text-white px-4 rounded-xl hover:bg-stone-800">
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between pt-4">
                    <button onClick={handleBack} className="text-stone-500 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-stone-100">
                      <ChevronLeft size={20} /> Voltar
                    </button>
                    <button onClick={handleNext} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700">
                      Próximo <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <User className="text-red-600" />
                    <h2 className="text-xl font-bold">Responsável e Vistoriante</h2>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest border-b pb-1">Dados do Responsável</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Nome Completo <span className="text-red-500">*</span></label>
                          <input 
                            type="text"
                            value={formData.responsible?.name}
                            onChange={(e) => updateNestedField('responsible', 'name', e.target.value)}
                            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                            placeholder="Nome do responsável"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">E-mail <span className="text-red-500">*</span></label>
                          <input 
                            type="email"
                            value={formData.responsible?.email}
                            onChange={(e) => {
                              let val = e.target.value;
                              if (!val.includes('@')) {
                                val = '@';
                              }
                              const parts = val.split('@');
                              if (parts.length > 2) {
                                val = parts[0] + '@' + parts.slice(1).join('');
                              }
                              updateNestedField('responsible', 'email', val);
                            }}
                            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                            placeholder="email@exemplo.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">CPF <span className="text-red-500">*</span></label>
                          <input 
                            type="text"
                            value={formData.responsible?.cpf}
                            onChange={(e) => updateNestedField('responsible', 'cpf', maskCPF(e.target.value))}
                            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                            placeholder="000.000.000-00"
                          />
                        </div>
                      </div>
                  </div>
                  <div className="space-y-4 pt-4">
                    <div className="flex justify-between items-center border-b pb-1">
                      <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest">Dados do Vistoriante</h3>
                      {formData.inspectors && formData.inspectors.length < 2 && (
                        <button 
                          onClick={() => setFormData(prev => ({ ...prev, inspectors: [...(prev.inspectors || []), { name: '', rank: '', registration: '' }] }))}
                          className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-bold hover:bg-red-200"
                        >
                          + Adicionar 2º Vistoriante
                        </button>
                      )}
                    </div>
                    {formData.inspectors?.map((inspector, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                        <div className="md:col-span-2 flex justify-between items-center">
                          <span className="text-[10px] font-bold text-stone-400 uppercase">Vistoriante {index + 1}</span>
                          {index > 0 && (
                            <button 
                              onClick={() => setFormData(prev => ({ ...prev, inspectors: prev.inspectors?.filter((_, i) => i !== index) }))}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Nome <span className="text-red-500">*</span></label>
                          <input 
                            type="text"
                            value={inspector.name}
                            onChange={(e) => {
                              const newInspectors = [...(formData.inspectors || [])];
                              newInspectors[index].name = e.target.value;
                              updateFormData('inspectors', newInspectors);
                            }}
                            className="w-full p-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                            placeholder="Nome do militar"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Matrícula <span className="text-red-500">*</span></label>
                          <input 
                            type="text"
                            value={inspector.registration}
                            onChange={(e) => {
                              const newInspectors = [...(formData.inspectors || [])];
                              newInspectors[index].registration = e.target.value;
                              updateFormData('inspectors', newInspectors);
                            }}
                            className="w-full p-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                            placeholder="000.000-0"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Graduação <span className="text-red-500">*</span></label>
                          <select 
                            value={inspector.rank}
                            onChange={(e) => {
                              const newInspectors = [...(formData.inspectors || [])];
                              newInspectors[index].rank = e.target.value;
                              updateFormData('inspectors', newInspectors);
                            }}
                            className="w-full p-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none appearance-none"
                          >
                            <option value="">Selecione</option>
                            {INSPECTOR_RANKS.map(rank => (
                              <option key={rank} value={rank}>{rank}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between pt-4">
                    <button onClick={handleBack} className="text-stone-500 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-stone-100">
                      <ChevronLeft size={20} /> Voltar
                    </button>
                    <button onClick={handleNext} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700">
                      Próximo <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <PenTool className="text-red-600" />
                    <h2 className="text-xl font-bold">Assinatura de quem acompanhou a vistoria</h2>
                  </div>
                  <div className="p-4 bg-stone-100 rounded-xl text-xs text-stone-700 leading-relaxed border-l-4 border-red-600">
                    EU <span className="font-bold underline">{formData.company?.accompaniedBy || '____________________'}</span>, CPF Nº <span className="font-bold underline">{formData.company?.accompaniedByCPF || '____________________'}</span>, recebi o presente documento e declaro que tenho ciência da NOTIFICAÇÃO e do prazo para cumprimento da mesma.
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Assinatura ({formData.company?.accompaniedBy} - CPF: {formData.company?.accompaniedByCPF})</label>
                      <button onClick={() => responsibleSigRef.current?.clear()} className="text-[10px] text-red-600 font-bold hover:underline">Limpar</button>
                    </div>
                    <div className="border-2 border-dashed border-stone-200 rounded-2xl bg-stone-50 overflow-hidden h-64">
                      <SignatureCanvas 
                        ref={responsibleSigRef}
                        penColor="#000080"
                        canvasProps={{ className: "w-full h-full" }}
                      />
                    </div>
                    <p className="text-[10px] text-stone-400 text-center italic">Assine dentro da área pontilhada</p>
                  </div>
                  <div className="flex justify-between pt-4">
                    <button onClick={handleBack} className="text-stone-500 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-stone-100">
                      <ChevronLeft size={20} /> Voltar
                    </button>
                    <button onClick={saveResponsibleSignature} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700">
                      Próximo <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <PenTool className="text-red-600" />
                    <h2 className="text-xl font-bold">Assinatura dos Vistoriantes</h2>
                  </div>
                  <div className="space-y-8">
                    {formData.inspectors?.map((inspector, index) => (
                      <div key={index} className="space-y-3">
                        <div className="flex justify-between items-end">
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Assinatura do Vistoriante {index + 1} ({inspector.rank} {inspector.name})</label>
                          <button onClick={() => inspectorSigRefs.current[index]?.clear()} className="text-[10px] text-red-600 font-bold hover:underline">Limpar</button>
                        </div>
                        <div className="border-2 border-dashed border-stone-200 rounded-2xl bg-stone-50 overflow-hidden h-48">
                          <SignatureCanvas 
                            ref={(el) => { inspectorSigRefs.current[index] = el; }}
                            penColor="#000080"
                            canvasProps={{ className: "w-full h-full" }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between pt-4">
                    <button onClick={handleBack} className="text-stone-500 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-stone-100">
                      <ChevronLeft size={20} /> Voltar
                    </button>
                    <button onClick={saveInspectorSignatures} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700">
                      Finalizar <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="text-red-600" />
                    <h2 className="text-xl font-bold">Revisão e Geração de Documento</h2>
                  </div>
                  <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase">Empresa <span className="text-red-500">*</span></p>
                        <p className="font-bold">{formData.company?.name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase">Tipo <span className="text-red-500">*</span></p>
                        <p className="font-bold text-red-600">{formData.type}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase">Responsável <span className="text-red-500">*</span></p>
                        <p className="font-bold">{formData.responsible?.name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase">E-mail <span className="text-red-500">*</span></p>
                        <p className="font-bold">{formData.responsible?.email}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] font-bold text-stone-400 uppercase">Ocupação</p>
                        <p className="font-bold">{formData.company?.occupation?.join(', ') || 'Nenhuma selecionada'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">Vistoriantes</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {formData.inspectors?.map((inspector, idx) => (
                          <div key={idx} className="text-xs bg-white p-2 rounded border border-stone-200">
                            <p className="font-bold">{inspector.rank} {inspector.name}</p>
                            <p className="text-stone-500">Matrícula: {inspector.registration}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">Irregularidades ({formData.irregularities?.length})</p>
                      <ul className="text-xs space-y-1">
                        {formData.irregularities?.map((i, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-red-600 mt-0.5">•</span>
                            <span>{i}</span>
                          </li>
                        ))}
                        {formData.irregularities?.length === 0 && <li className="text-stone-400 italic">Nenhuma irregularidade selecionada</li>}
                      </ul>
                    </div>
                  </div>

                  <div className="absolute opacity-100 pointer-events-none -z-50" style={{ left: '-10000px' }}>
                    <div ref={pdfHeaderRef} className="w-[210mm] p-12 pb-0 font-sans text-black bg-white uppercase">
                      <div className="flex justify-between items-center pb-6 mb-8 border-b-4 border-black">
                        <img 
                          src={`/api/proxy-image?url=${encodeURIComponent('https://www.bombeiros.ms.gov.br/wp-content/uploads/2015/01/Bras%C3%A3o_estilizado_tipo_texto._jpg.jpg')}`}
                          style={{ width: '100px', height: '100px' }}
                          className="object-contain" 
                          alt="Logo CBMMS" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="text-center flex-1 px-6">
                          <p className="text-[11px] font-black uppercase tracking-tighter text-black">Estado de Mato Grosso do Sul</p>
                          <p className="text-[11px] font-bold uppercase text-black">Secretaria de Estado de Justiça e Segurança Pública</p>
                          <p className="text-[19px] font-black uppercase mt-1 text-black">Corpo de Bombeiros Militar</p>
                          <p className="text-[11px] font-bold text-black">{formData.unit}</p>
                        </div>
                        <div className="w-20"></div>
                      </div>

                      <div className="flex justify-between items-stretch mb-8 rounded-lg overflow-hidden border border-black bg-white">
                        <div className="flex-1 p-4 pb-10 border-r border-black">
                          <h1 className="text-[31px] font-black uppercase leading-none text-black">NOTIFICAÇÃO</h1>
                          <p className="text-[13px] font-bold mt-1 text-black">EXIGÊNCIA DE VISTORIA TÉCNICA</p>
                        </div>
                        <div className="p-4 bg-white min-w-[220px] flex flex-col justify-center">
                          <p className="text-[11px] font-black uppercase tracking-widest mb-1 text-black">Identificação</p>
                          <p className="text-[13px] font-black text-black">PRE: {formData.preNumber}/PRE</p>
                          <p className="text-[13px] font-black text-black">Nº NOTIFICAÇÃO: {formData.notificationNumber}</p>
                          <div className="flex gap-4 mt-2 text-[11px] font-bold text-black">
                            <span>{format(new Date(), "dd/MM/yyyy")}</span>
                            <span>{format(new Date(), "HH:mm")}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div ref={pdfBodyRef} className="w-[210mm] p-12 pt-0 font-sans text-black bg-white uppercase">
                      <div className="space-y-6">
                        <div id="pdf-section-data" className="rounded-xl border border-black overflow-hidden" style={{ borderColor: '#000000' }}>
                          <div className="text-white px-4 py-2 text-[11px] font-black uppercase tracking-widest bg-black" style={{ backgroundColor: '#000000', color: '#ffffff' }}>Dados da Edificação / Evento</div>
                          <div className="p-4 grid grid-cols-2 gap-y-3 gap-x-6 text-[12px]">
                            <div className="col-span-2 flex border-b border-stone-100 pb-1" style={{ borderBottomColor: '#f5f5f4' }}>
                              <span className="font-black uppercase w-32 text-black" style={{ color: '#000000' }}>Razão Social:</span>
                              <span className="font-bold text-black" style={{ color: '#000000' }}>{formData.company?.name}</span>
                            </div>
                            <div className="flex border-b border-stone-100 pb-1" style={{ borderBottomColor: '#f5f5f4' }}>
                              <span className="font-black uppercase w-32 text-black" style={{ color: '#000000' }}>CNPJ/CPF:</span>
                              <span className="font-bold text-black" style={{ color: '#000000' }}>{formData.company?.cnpj}</span>
                            </div>
                            <div className="flex border-b border-stone-100 pb-1" style={{ borderBottomColor: '#f5f5f4' }}>
                              <span className="font-black uppercase w-32 text-black" style={{ color: '#000000' }}>{formData.company?.pscipStatus === 'PTS' ? 'PTS:' : 'Nº PSCIP:'}</span>
                              <span className="font-bold text-black" style={{ color: '#000000' }}>
                                {formData.company?.pscip} 
                                {formData.company?.pscipStatus && formData.company?.pscipStatus !== 'PTS' && ` ${formData.company.pscipStatus}`}
                              </span>
                            </div>
                            <div className="flex border-b border-stone-100 pb-1" style={{ borderBottomColor: '#f5f5f4' }}>
                              <span className="font-black uppercase w-32 text-black" style={{ color: '#000000' }}>ÁREA:</span>
                              <span className="font-bold text-black" style={{ color: '#000000' }}>{formData.company?.area ? `${formData.company.area} M²` : ''}</span>
                            </div>
                            <div className="flex border-b border-stone-100 pb-1" style={{ borderBottomColor: '#f5f5f4' }}>
                              <span className="font-black uppercase w-32 text-black" style={{ color: '#000000' }}>Responsável:</span>
                              <span className="font-bold text-black" style={{ color: '#000000' }}>{formData.responsible?.name}</span>
                            </div>
                            <div className="flex border-b border-stone-100 pb-1" style={{ borderBottomColor: '#f5f5f4' }}>
                              <span className="font-black uppercase w-32 text-black" style={{ color: '#000000' }}>Classificação da Edificação:</span>
                              <span className="font-bold text-black" style={{ color: '#000000' }}>{formData.company?.occupation?.join(', ')}</span>
                            </div>
                            <div className="col-span-2 flex border-b border-stone-100 pb-1" style={{ borderBottomColor: '#f5f5f4' }}>
                              <span className="font-black uppercase w-32 text-black" style={{ color: '#000000' }}>Endereço:</span>
                              <span className="font-bold text-black" style={{ color: '#000000' }}>
                                {formData.company?.street}, {formData.company?.number}
                                {formData.company?.complement && ` - ${formData.company.complement}`}
                                 - {formData.company?.neighborhood}
                                {formData.company?.city && ` - ${formData.company.city}`}
                              </span>
                            </div>
                            <div className="flex border-b border-stone-100 pb-1" style={{ borderBottomColor: '#f5f5f4' }}>
                              <span className="font-black uppercase w-32 text-black" style={{ color: '#000000' }}>Telefone:</span>
                              <span className="font-bold text-black" style={{ color: '#000000' }}>{formData.company?.phone}</span>
                            </div>
                          </div>
                        </div>

                        <div id="pdf-section-deadline" className="rounded-xl border-2 border-black p-5 bg-white" style={{ borderColor: '#000000', backgroundColor: '#ffffff' }}>
                          <h2 className="text-[13px] font-black uppercase mb-3 flex items-center gap-2 text-black" style={{ color: '#000000' }}>
                            <AlertTriangle size={14} /> PRAZO PARA CUMPRIMENTO
                          </h2>
                          <div className="space-y-3 text-[12px] leading-relaxed text-black" style={{ color: '#000000' }}>
                            <p>Em conformidade com a <strong>Lei Estadual nº 4.335/2013</strong>, Vossa Senhoria deverá cumprir as exigências listadas abaixo no prazo de <span className="text-black font-black underline decoration-2 underline-offset-4" style={{ color: '#000000' }}>{formData.deadlineDays} DIAS</span>, a contar da data de recebimento deste documento.</p>
                            <p className="text-red-600 font-black uppercase" style={{ color: '#ff0000' }}>O PRAZO PARA CUMPRIMENTO DESTA NOTIFICAÇÃO SE ENCERRA EM: {formData.date && formData.deadlineDays ? format(addDays(new Date(formData.date), formData.deadlineDays), "dd/MM/yyyy") : format(addDays(new Date(), 30), "dd/MM/yyyy")}</p>
                            <p className="font-bold text-black" style={{ color: '#000000' }}>O não cumprimento desta notificação sujeita o infrator à multa, interdição ou outras penalidades previstas em Lei.</p>
                            <p className="border-l-4 border-black pl-3 italic text-black" style={{ borderLeftColor: '#000000', color: '#000000' }}>Vossa Senhoria fica cientificada de que, conforme o Art. 9º da Lei nº 4.335/2013, o local não pode funcionar sem o devido Alvará do Corpo de Bombeiros Militar do Mato Grosso do Sul.</p>
                          </div>
                        </div>

                        <div id="pdf-section-irregularities" className="rounded-xl border border-black overflow-hidden" style={{ borderColor: '#000000' }}>
                          <div className="text-white px-4 py-2 text-[11px] font-black uppercase tracking-widest bg-black" style={{ backgroundColor: '#000000', color: '#ffffff' }}>Exigências Técnicas a Cumprir</div>
                          <div className="p-6 space-y-1">
                            {formData.irregularities?.map((i, idx) => (
                              <div key={idx} className="pdf-irregularity-item flex gap-4 items-start border-b border-stone-50 pb-1 last:border-0" style={{ lineHeight: '1.15', borderBottomColor: '#fafaf9' }}>
                                <span className="flex items-center justify-center w-5 h-5 rounded-full font-black text-[10px] shrink-0 bg-stone-100 text-stone-900" style={{ backgroundColor: '#f5f5f4', color: '#1c1917' }}>{idx + 1}</span>
                                <span className="text-[12px] font-medium pt-0.5 text-stone-800" style={{ color: '#292524' }}>{i}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div id="pdf-section-return" className="rounded-xl border border-black p-5 bg-white flex items-center gap-6" style={{ borderColor: '#000000', backgroundColor: '#ffffff' }}>
                          <div className="flex-1 space-y-2">
                            <p className="text-[12px] leading-relaxed text-black font-medium" style={{ color: '#000000' }}>
                              Ao cumprir todas as exigências desta notificação, acesse o site <span className="text-blue-600 font-bold underline" style={{ color: '#2563eb' }}>https://prevenir.bombeiros.ms.gov.br</span> aba <span className="font-bold">"ATENDIMENTO TÉCNICO"</span> e solicite o retorno de vistoria para esta edificação.
                            </p>
                          </div>
                          <div className="shrink-0 bg-white p-2 rounded-lg border border-black shadow-sm" style={{ backgroundColor: '#ffffff', borderColor: '#000000' }}>
                            <QRCodeCanvas 
                              value="https://prevenir.bombeiros.ms.gov.br/"
                              size={80}
                              level="H"
                              includeMargin={false}
                            />
                            <p className="text-[9px] text-center mt-1 font-bold text-black uppercase tracking-tighter" style={{ color: '#000000' }}>Acesse o Prevenir</p>
                          </div>
                        </div>

                        <div id="pdf-section-signatures" className="mt-12 grid grid-cols-2 gap-12 pb-12">
                          <div className="col-span-2 mb-6 text-[12px] leading-relaxed text-black" style={{ color: '#000000' }}>
                            EU <span className="font-bold underline">{formData.company?.accompaniedBy || '____________________'}</span>, CPF Nº <span className="font-bold underline">{formData.company?.accompaniedByCPF || '____________________'}</span>, recebi o presente documento e declaro que tenho ciência da NOTIFICAÇÃO e do prazo para cumprimento da mesma.
                          </div>
                          
                          <div className="col-span-2 text-right text-[12px] font-bold text-black mb-8" style={{ color: '#000000' }}>
                            {formData.company?.city?.toUpperCase() || 'CIDADE'} - MS, {formatDateInPortuguese()}
                          </div>

                          <div className="text-center space-y-3">
                            <div className="h-24 flex items-end justify-center border-b-2 border-black pb-2" style={{ borderBottomColor: '#000000' }}>
                              {formData.signatures?.responsible && <img src={formData.signatures.responsible} className="max-h-full grayscale" alt="Assinatura Responsável" />}
                            </div>
                            <div>
                              <p className="text-[12px] font-black uppercase text-black" style={{ color: '#000000' }}>{formData.company?.accompaniedBy}</p>
                              <p className="text-[10px] font-bold uppercase text-black" style={{ color: '#000000' }}>CPF: {formData.company?.accompaniedByCPF}</p>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-black" style={{ color: '#000000' }}>Acompanhou a Vistoria</p>
                            </div>
                          </div>
                          <div className="space-y-8">
                            {formData.inspectors?.map((inspector, index) => (
                              <div key={index} className="text-center space-y-3">
                                <div className="h-24 flex items-end justify-center border-b-2 border-black pb-2" style={{ borderBottomColor: '#000000' }}>
                                  {formData.signatures?.inspectors?.[index] && <img src={formData.signatures.inspectors[index]} className="max-h-full grayscale" alt={`Assinatura Vistoriante ${index + 1}`} />}
                                </div>
                                <div>
                                  <p className="text-[12px] font-black uppercase text-black" style={{ color: '#000000' }}>{inspector.rank} {inspector.name}</p>
                                  <p className="text-[10px] font-bold uppercase text-black" style={{ color: '#000000' }}>Matrícula: {inspector.registration}</p>
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-black" style={{ color: '#000000' }}>Vistoriante do CBMMS</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* PDF Footer (Visual only in preview, added manually to PDF) */}
                        <div className="mt-16 pt-4 border-t border-stone-200 text-center">
                          <p className="text-[10px] text-stone-500 font-medium leading-tight">
                            {formData.unit && GBM_FOOTERS[formData.unit]}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <button onClick={handleBack} className="text-stone-500 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-stone-100">
                      <ChevronLeft size={20} /> Voltar
                    </button>
                    <button 
                      onClick={generatePDF} 
                      disabled={isSubmitting}
                      className={cn(
                        "bg-red-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 shadow-lg shadow-red-200",
                        isSubmitting && "opacity-70 cursor-not-allowed"
                      )}
                    >
                      {isSubmitting ? <>Processando...</> : <>Finalizar e Enviar <Send size={20} /></>}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <footer className="max-w-4xl mx-auto mt-12 px-4 text-center">
        <p className="text-stone-400 text-xs font-medium">© 2026 Bombeiro Digital - Sistema de Gestão de Vistorias Técnicas</p>
      </footer>
    </div>
  );
}
