import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
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
import { InspectionData, IRREGULARITIES_LIST, INSPECTOR_RANKS, OCCUPATIONS_LIST } from './types';

export default function App() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [customIrregularity, setCustomIrregularity] = useState('');
  
  const [isOccupationDropdownOpen, setIsOccupationDropdownOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  
  const [formData, setFormData] = useState<Partial<InspectionData>>({
    date: new Date().toISOString(),
    type: 'NOTIFICAÇÃO',
    preNumber: '',
    notificationNumber: '',
    deadlineDays: 30,
    company: { name: '', cnpj: '', street: '', number: '', neighborhood: '', city: '', address: '', phone: '', occupation: [], pscip: '' },
    irregularities: [],
    responsible: { name: '', email: '@', cpf: '' },
    witness: { name: '', role: '', cpf: '', rg: '' },
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
      toggleIrregularity(customIrregularity.trim());
      setCustomIrregularity('');
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
      setErrors({});
    }
  };

  const validateStep = (currentStep: number) => {
    const newErrors: Record<string, boolean> = {};
    let isValid = true;

    switch (currentStep) {
      case 1:
        if (!formData.preNumber) { newErrors.preNumber = true; isValid = false; }
        if (!formData.notificationNumber) { newErrors.notificationNumber = true; isValid = false; }
        if (!formData.company?.pscip) { newErrors.pscip = true; isValid = false; }
        if (!formData.company?.name) { newErrors.companyName = true; isValid = false; }
        if (!formData.company?.cnpj) { newErrors.companyCnpj = true; isValid = false; }
        if (!formData.company?.street) { newErrors.companyStreet = true; isValid = false; }
        if (!formData.company?.number) { newErrors.companyNumber = true; isValid = false; }
        if (!formData.company?.neighborhood) { newErrors.companyNeighborhood = true; isValid = false; }
        if (!formData.company?.city) { newErrors.companyCity = true; isValid = false; }
        if (!formData.company?.phone) { newErrors.companyPhone = true; isValid = false; }
        if (!formData.company?.occupation || formData.company.occupation.length === 0) { newErrors.companyOccupation = true; isValid = false; }
        
        if (!formData.witness?.name) { newErrors.witnessName = true; isValid = false; }
        if (!formData.witness?.role) { newErrors.witnessRole = true; isValid = false; }
        if (!formData.witness?.rg) { newErrors.witnessRg = true; isValid = false; }
        if (!formData.witness?.cpf) { newErrors.witnessCpf = true; isValid = false; }

        if (!isValid) {
          alert('Por favor, preencha todos os campos obrigatórios destacados em vermelho.');
        }
        break;
      case 2:
        if (!formData.irregularities || formData.irregularities.length === 0) {
          newErrors.irregularities = true;
          isValid = false;
          alert('Por favor, selecione pelo menos uma irregularidade.');
        }
        break;
      case 3:
        if (!formData.responsible?.name) { newErrors.responsibleName = true; isValid = false; }
        if (!formData.responsible?.email || formData.responsible.email === '@') { newErrors.responsibleEmail = true; isValid = false; }
        if (!formData.responsible?.cpf) { newErrors.responsibleCpf = true; isValid = false; }
        
        formData.inspectors?.forEach((inspector, idx) => {
          if (!inspector.name) { newErrors[`inspectorName_${idx}`] = true; isValid = false; }
          if (!inspector.rank) { newErrors[`inspectorRank_${idx}`] = true; isValid = false; }
          if (!inspector.registration) { newErrors[`inspectorRegistration_${idx}`] = true; isValid = false; }
        });

        if (!isValid) {
          alert('Por favor, preencha todos os campos obrigatórios destacados em vermelho.');
        }
        break;
      case 5:
        // Signatures are now optional
        isValid = true;
        break;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
    setErrors({});
  };

  const saveResponsibleSignature = () => {
    setFormData(prev => ({
      ...prev,
      signatures: {
        ...prev.signatures!,
        responsible: responsibleSigRef.current && !responsibleSigRef.current.isEmpty() 
          ? responsibleSigRef.current.toDataURL() 
          : ''
      }
    }));
    setStep(prev => prev + 1);
  };

  const saveInspectorSignatures = () => {
    const inspectorSigs = formData.inspectors.map((_, index) => {
      const ref = inspectorSigRefs.current[index];
      return ref && !ref.isEmpty() ? ref.toDataURL() : '';
    });

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
    console.log('Starting PDF generation...');
    if (!pdfHeaderRef.current || !pdfBodyRef.current) {
      console.error('PDF refs not found');
      alert('Erro interno: Referências do PDF não encontradas.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Small delay to ensure images are loaded
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const bottomMargin = 20;
      const sidePadding = 12;
      
      console.log('Capturing header...');
      // 1. Capture Header
      const headerCanvas = await html2canvas(pdfHeaderRef.current, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: true
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
        console.log(`Capturing section: ${elementId}`);
        const element = document.getElementById(elementId);
        if (!element) {
          console.warn(`Element not found: ${elementId}`);
          return;
        }
        
        const canvas = await html2canvas(element, { 
          scale: 1.5, 
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
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
        currentY += imgHeight + 6; // Spacing between sections
      };

      // Initial page setup
      addHeaderAndPageNumber(1);

      // Add sections in order
      try {
        await addSection('pdf-section-data');
        await addSection('pdf-section-deadline');
        await addSection('pdf-section-irregularities');
        await addSection('pdf-section-return');
        await addSection('pdf-section-signatures');
      } catch (sectionError) {
        console.error('Error adding sections to PDF:', sectionError);
        throw sectionError;
      }

      // Finalize PDF: Add page numbers and footer
      console.log('Finalizing PDF...');
      const totalPages = currentPage;
      for (let i = 1; i <= totalPages; i++) {
        try {
          pdf.setPage(i);
          
          // Add Page Number (e.g. 1/3)
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(0, 0, 0);
          pdf.text(`${i}/${totalPages}`, 185, 48);
        } catch (pageError) {
          console.error(`Error processing page ${i}:`, pageError);
        }
      }
      
      console.log('PDF generated successfully. Saving and sending...');
      let pdfBase64 = '';
      try {
        pdfBase64 = pdf.output('datauristring').split(',')[1];
      } catch (outputError) {
        console.error('Error generating PDF output string:', outputError);
        throw outputError;
      }
      
      // Save locally for the user
      const fileName = `NOT ${formData.notificationNumber} - ${formData.company?.name || 'documento'}.pdf`.replace(/\//g, '_');
      pdf.save(fileName);
      
      // Send to server for Email and SMS delivery
      try {
        console.log('Sending PDF to server...');
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
        if (!response.ok) {
          console.error('Server responded with error:', response.statusText);
        } else {
          console.log('PDF sent to server successfully');
        }
      } catch (apiError) {
        console.error('Error sending PDF to server:', apiError);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsSuccess(true);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Ocorreu um erro ao gerar o PDF. Verifique os dados e tente novamente.');
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
      preNumber: '',
      notificationNumber: '',
      deadlineDays: 30,
      company: { name: '', cnpj: '', pscip: '', street: '', number: '', neighborhood: '', city: '', address: '', phone: '', occupation: [] },
      irregularities: [],
      responsible: { name: '', email: '@', cpf: '' },
      witness: { name: '', role: '', cpf: '', rg: '' },
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
              <button 
                onClick={resetForm}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-red-200"
              >
                Nova Vistoria
              </button>
            </motion.div>
          ) : (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white p-8 rounded-3xl shadow-xl border border-stone-100"
            >
              {step === 1 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Building2 className="text-red-600" />
                    <h2 className="text-xl font-bold">Dados da Empresa</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">PRE</label>
                      <div className="flex items-center">
                        <input 
                          type="text"
                          value={formData.preNumber}
                          onChange={(e) => updateFormData('preNumber', e.target.value.replace(/PRÉ/gi, 'PRE'))}
                          className={cn(
                            "flex-1 p-3 bg-stone-50 border border-stone-200 rounded-l-xl focus:ring-2 focus:ring-red-500 outline-none",
                            errors.preNumber && "border-red-500 ring-2 ring-red-200"
                          )}
                          placeholder="0000"
                        />
                        <span className={cn(
                          "bg-stone-200 px-4 py-3 border border-l-0 border-stone-200 rounded-r-xl font-bold text-stone-600",
                          errors.preNumber && "border-red-500"
                        )}>/PRE</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Nº NOTIFICAÇÃO</label>
                      <input 
                        type="text"
                        value={formData.notificationNumber}
                        onChange={(e) => updateFormData('notificationNumber', maskNotification(e.target.value))}
                        className={cn(
                          "w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none",
                          errors.notificationNumber && "border-red-500 ring-2 ring-red-200"
                        )}
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
                        className={cn(
                          "w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none",
                          errors.pscip && "border-red-500 ring-2 ring-red-200"
                        )}
                        placeholder="Nº do Processo"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Nome / Razão Social</label>
                      <input 
                        type="text"
                        value={formData.company?.name}
                        onChange={(e) => updateNestedField('company', 'name', e.target.value)}
                        className={cn(
                          "w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none",
                          errors.companyName && "border-red-500 ring-2 ring-red-200"
                        )}
                        placeholder="Ex: Mercado Silva LTDA"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">CNPJ / CPF</label>
                      <input 
                        type="text"
                        value={formData.company?.cnpj}
                        onChange={(e) => updateNestedField('company', 'cnpj', maskCPFOrCNPJ(e.target.value))}
                        className={cn(
                          "w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none",
                          errors.companyCnpj && "border-red-500 ring-2 ring-red-200"
                        )}
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2 relative">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">OCUPAÇÃO (Selecione uma ou mais)</label>
                      <div 
                        onClick={() => setIsOccupationDropdownOpen(!isOccupationDropdownOpen)}
                        className={cn(
                          "w-full p-3 bg-stone-50 border border-stone-200 rounded-xl flex justify-between items-center cursor-pointer hover:border-stone-300 transition-colors",
                          errors.companyOccupation && "border-red-500 ring-2 ring-red-200"
                        )}
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
                        className={cn(
                          "w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none",
                          errors.companyStreet && "border-red-500 ring-2 ring-red-200"
                        )}
                        placeholder="Rua, Avenida, etc."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Nº</label>
                      <input 
                        type="text"
                        value={formData.company?.number}
                        onChange={(e) => updateNestedField('company', 'number', e.target.value)}
                        className={cn(
                          "w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none",
                          errors.companyNumber && "border-red-500 ring-2 ring-red-200"
                        )}
                        placeholder="123"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Bairro</label>
                      <input 
                        type="text"
                        value={formData.company?.neighborhood}
                        onChange={(e) => updateNestedField('company', 'neighborhood', e.target.value)}
                        className={cn(
                          "w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none",
                          errors.companyNeighborhood && "border-red-500 ring-2 ring-red-200"
                        )}
                        placeholder="Centro"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Cidade</label>
                      <input 
                        type="text"
                        value={formData.company?.city}
                        onChange={(e) => updateNestedField('company', 'city', e.target.value)}
                        className={cn(
                          "w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none",
                          errors.companyCity && "border-red-500 ring-2 ring-red-200"
                        )}
                        placeholder="Maracaju"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Telefone de Contato</label>
                      <input 
                        type="text"
                        value={formData.company?.phone}
                        onChange={(e) => updateNestedField('company', 'phone', maskPhone(e.target.value))}
                        className={cn(
                          "w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none",
                          errors.companyPhone && "border-red-500 ring-2 ring-red-200"
                        )}
                        placeholder="(00) 00000-0000"
                      />
                    </div>

                    <div className="md:col-span-2 pt-4 border-t border-stone-100">
                      <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Acompanhou a Vistoria</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Nome</label>
                          <input 
                            type="text"
                            value={formData.witness?.name}
                            onChange={(e) => updateNestedField('witness', 'name', e.target.value)}
                            className={cn(
                              "w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none",
                              errors.witnessName && "border-red-500 ring-2 ring-red-200"
                            )}
                            placeholder="Nome de quem acompanhou"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Função no Local</label>
                          <input 
                            type="text"
                            value={formData.witness?.role}
                            onChange={(e) => updateNestedField('witness', 'role', e.target.value)}
                            className={cn(
                              "w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none",
                              errors.witnessRole && "border-red-500 ring-2 ring-red-200"
                            )}
                            placeholder="Ex: Gerente, Proprietário"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">RG</label>
                          <input 
                            type="text"
                            value={formData.witness?.rg}
                            onChange={(e) => updateNestedField('witness', 'rg', e.target.value)}
                            className={cn(
                              "w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none",
                              errors.witnessRg && "border-red-500 ring-2 ring-red-200"
                            )}
                            placeholder="0.000.000"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">CPF</label>
                          <input 
                            type="text"
                            value={formData.witness?.cpf}
                            onChange={(e) => updateNestedField('witness', 'cpf', maskCPF(e.target.value))}
                            className={cn(
                              "w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none",
                              errors.witnessCpf && "border-red-500 ring-2 ring-red-200"
                            )}
                            placeholder="000.000.000-00"
                          />
                        </div>
                      </div>
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
                    <div className={cn(
                      "space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar p-1 rounded-xl",
                      errors.irregularities && "border-2 border-red-500 bg-red-50"
                    )}>
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
                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Nome Completo</label>
                        <input 
                          type="text"
                          value={formData.responsible?.name}
                          onChange={(e) => updateNestedField('responsible', 'name', e.target.value)}
                          className={cn(
                            "w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none",
                            errors.responsibleName && "border-red-500 ring-2 ring-red-200"
                          )}
                          placeholder="Nome do responsável"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">E-mail</label>
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
                          className={cn(
                            "w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none",
                            errors.responsibleEmail && "border-red-500 ring-2 ring-red-200"
                          )}
                          placeholder="email@exemplo.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">CPF</label>
                        <input 
                          type="text"
                          value={formData.responsible?.cpf}
                          onChange={(e) => updateNestedField('responsible', 'cpf', maskCPF(e.target.value))}
                          className={cn(
                            "w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none",
                            errors.responsibleCpf && "border-red-500 ring-2 ring-red-200"
                          )}
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
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Nome</label>
                          <input 
                            type="text"
                            value={inspector.name}
                            onChange={(e) => {
                              const newInspectors = [...(formData.inspectors || [])];
                              newInspectors[index].name = e.target.value;
                              updateFormData('inspectors', newInspectors);
                            }}
                            className={cn(
                              "w-full p-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none",
                              errors[`inspectorName_${index}`] && "border-red-500 ring-2 ring-red-200"
                            )}
                            placeholder="Nome do militar"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Matrícula</label>
                          <input 
                            type="text"
                            value={inspector.registration}
                            onChange={(e) => {
                              const newInspectors = [...(formData.inspectors || [])];
                              newInspectors[index].registration = e.target.value;
                              updateFormData('inspectors', newInspectors);
                            }}
                            className={cn(
                              "w-full p-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none",
                              errors[`inspectorRegistration_${index}`] && "border-red-500 ring-2 ring-red-200"
                            )}
                            placeholder="000.000-0"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Graduação</label>
                          <select 
                            value={inspector.rank}
                            onChange={(e) => {
                              const newInspectors = [...(formData.inspectors || [])];
                              newInspectors[index].rank = e.target.value;
                              updateFormData('inspectors', newInspectors);
                            }}
                            className={cn(
                              "w-full p-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none appearance-none",
                              errors[`inspectorRank_${index}`] && "border-red-500 ring-2 ring-red-200"
                            )}
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
                    <h2 className="text-xl font-bold">Assinatura de quem acompanhou</h2>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Assinatura: {formData.witness?.name} ({formData.witness?.role})</label>
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
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase">Empresa</p>
                        <p className="font-bold">{formData.company?.name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase">Tipo</p>
                        <p className="font-bold text-red-600">{formData.type}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase">Responsável</p>
                        <p className="font-bold">{formData.responsible?.name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase">E-mail</p>
                        <p className="font-bold">{formData.responsible?.email}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase">Acompanhou a Vistoria</p>
                        <p className="font-bold">{formData.witness?.name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase">Função</p>
                        <p className="font-bold">{formData.witness?.role}</p>
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

                  <div className="absolute top-0 left-0 -z-50 opacity-0 pointer-events-none overflow-hidden h-0">
                    <div ref={pdfHeaderRef} className="w-[210mm] p-8 pb-0 font-sans text-black bg-white">
                      <div className="flex justify-between items-center pb-4 mb-4 border-b-2 border-black">
                        <img 
                          src={`/api/proxy-image?url=${encodeURIComponent('https://www.bombeiros.ms.gov.br/wp-content/uploads/2015/01/Bras%C3%A3o_estilizado_tipo_texto._jpg.jpg')}`} 
                          className="w-[80px] h-[80px] object-contain" 
                          alt="Logo CBMMS" 
                          crossOrigin="anonymous"
                        />
                        <div className="text-center flex-1 px-4">
                          <p className="text-[12px] font-black uppercase text-black">ESTADO DE MATO GROSSO DO SUL</p>
                          <p className="text-[11px] font-bold uppercase text-black">SECRETARIA DE ESTADO DE JUSTIÇA E SEGURANÇA PÚBLICA</p>
                          <p className="text-[14px] font-black uppercase text-black">CORPO DE BOMBEIROS MILITAR</p>
                        </div>
                        <img 
                          src={`/api/proxy-image?url=${encodeURIComponent('https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Bras%C3%A3o_de_Mato_Grosso_do_Sul.svg/1200px-Bras%C3%A3o_de_Mato_Grosso_do_Sul.svg.png')}`} 
                          className="w-[80px] h-[80px] object-contain" 
                          alt="Brasão MS" 
                          crossOrigin="anonymous"
                        />
                      </div>

                      <div className="flex flex-col items-center mb-4">
                        <div className="border-2 border-black p-2 w-full text-center">
                          <h1 className="text-[22px] font-black uppercase leading-none text-black">NOTIFICAÇÃO</h1>
                          <p className="text-[16px] font-black mt-1 text-black">EXIGÊNCIA DE VISTORIA</p>
                          <div className="mt-2 border-t border-black pt-1">
                            <p className="text-[16px] font-black text-black">Nº {formData.notificationNumber} /13º SGBM/Ind 20{format(new Date(), "yy")}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div ref={pdfBodyRef} className="w-[210mm] p-8 pt-0 font-sans text-black bg-white">
                      <div className="space-y-4">
                        <div id="pdf-section-data" className="space-y-4">
                          <div className="text-[12px] border-t border-black pt-2">
                            <div className="grid grid-cols-2 gap-y-1">
                              <div className="flex border-b border-black pb-0.5">
                                <span className="font-black uppercase w-16">PSCIP:</span>
                                <span className="font-medium">{formData.company?.pscip}</span>
                              </div>
                              <div className="flex border-b border-black pb-0.5 ml-4">
                                <span className="font-black uppercase w-12">PRE:</span>
                                <span className="font-medium">{formData.preNumber}</span>
                              </div>
                              <div className="col-span-2 flex border-b border-black pb-0.5">
                                <span className="font-black uppercase w-24">CNPJ/CPF:</span>
                                <span className="font-medium">{formData.company?.cnpj}</span>
                              </div>
                              <div className="col-span-2 flex border-b border-black pb-0.5">
                                <span className="font-black uppercase w-32">Razão Social:</span>
                                <span className="font-medium">{formData.company?.name}</span>
                              </div>
                              <div className="col-span-2 flex border-b border-black pb-0.5">
                                <span className="font-black uppercase w-56">Proprietário ou Responsável:</span>
                                <span className="font-medium">{formData.responsible?.name} {formData.responsible?.cpf ? `- CPF: ${formData.responsible.cpf}` : ''}</span>
                              </div>
                              <div className="col-span-2 flex border-b border-black pb-0.5">
                                <span className="font-black uppercase w-56">Endereço da Edificação:</span>
                                <span className="font-medium">{formData.company?.street}, {formData.company?.number}</span>
                              </div>
                              <div className="col-span-2 grid grid-cols-3 gap-4 border-b border-black pb-0.5">
                                <div className="flex">
                                  <span className="font-black uppercase w-16">Bairro:</span>
                                  <span className="font-medium">{formData.company?.neighborhood}</span>
                                </div>
                                <div className="flex">
                                  <span className="font-black uppercase w-16">Fone:</span>
                                  <span className="font-medium">{formData.company?.phone}</span>
                                </div>
                                <div className="flex">
                                  <span className="font-black uppercase w-16">Cidade:</span>
                                  <span className="font-medium">{formData.company?.city} /MS</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="border-2 border-black p-2 text-[12px]">
                            <p className="font-bold">Classificação da Edificação quanto à ocupação do local, de acordo com a Tabela 1 da Lei 4.335/2013: <span className="text-blue-700 font-black text-[14px] ml-2">{formData.company?.occupation?.[0]?.split(' ')[0]}</span></p>
                          </div>
                        </div>

                        <div id="pdf-section-deadline" className="text-[12px] leading-tight">
                          <p>De conformidade com Lei 4.335/2013, V. Sª. deverá cumprir as exigências abaixo, no prazo de <span className="font-black text-[14px] text-blue-700 underline px-2">{formData.deadlineDays} {formData.deadlineDays === 1 ? 'DIA' : 'DIAS'}</span>, a contar da data do recebimento deste documento.</p>
                        </div>

                        <div id="pdf-section-irregularities" className="border border-black min-h-[300px]">
                          <table className="w-full text-[12px] border-collapse">
                            <tbody>
                              {formData.irregularities?.map((i, idx) => (
                                <tr key={idx} className="border-b border-black">
                                  <td className="p-2 border-r border-black w-8 text-center font-bold">{idx + 1}</td>
                                  <td className="p-2">{i}</td>
                                </tr>
                              ))}
                              {/* Fill empty rows to match the look of the paper form */}
                              {Array.from({ length: Math.max(0, 10 - (formData.irregularities?.length || 0)) }).map((_, idx) => (
                                <tr key={`empty-${idx}`} className="border-b border-black h-8">
                                  <td className="p-2 border-r border-black w-8"></td>
                                  <td className="p-2"></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div id="pdf-section-return" className="space-y-4">
                          <div className="border-2 border-black p-2 text-[11px] text-center font-bold">
                            <p>O não cumprimento desta notificação sujeita o infrator à multa, interdição ou outra penalidade cominada em Lei, podendo ser emitida notificação posterior se for identificada alguma exigência.</p>
                          </div>

                          <div className="text-[11px] italic border-t border-black pt-2 mt-4">
                            <p>Esta notificação foi emitida no dia {format(new Date(), "dd/MM/yyyy")} às {format(new Date(), "HH:mm")}, sendo a pessoa abaixo assinada e identificada, ciente das suas responsabilidades.</p>
                          </div>
                        </div>

                        <div id="pdf-section-signatures" className="space-y-6">
                          <div className="text-[12px] space-y-2 mt-4">
                            <p className="font-black uppercase text-center border-b border-black pb-1">ACOMPANHOU A VISTORIA</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                              <div className="flex border-b border-black">
                                <span className="font-black mr-2">Nome:</span>
                                <span className="font-medium truncate">{formData.witness?.name}</span>
                              </div>
                              <div className="flex border-b border-black">
                                <span className="font-black mr-2">Função:</span>
                                <span className="font-medium">{formData.witness?.role}</span>
                              </div>
                              <div className="flex border-b border-black">
                                <span className="font-black mr-2">RG:</span>
                                <span className="font-medium">{formData.witness?.rg}</span>
                              </div>
                              <div className="flex border-b border-black">
                                <span className="font-black mr-2">CPF:</span>
                                <span className="font-medium">{formData.witness?.cpf}</span>
                              </div>
                            </div>
                            <div className="flex items-end gap-4 mt-2">
                              <span className="font-black">Assinatura:</span>
                              <div className="flex-1 border-b border-black h-12 flex items-center justify-center">
                                {formData.signatures?.responsible && <img src={formData.signatures.responsible} className="max-h-full grayscale" alt="Assinatura" />}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-8 text-[11px] mt-4">
                            <div className="flex flex-col">
                              <div className="flex border-b border-black mb-2">
                                <span className="font-black mr-2">Local:</span>
                                <span className="font-medium">{formData.company?.city} - MS</span>
                              </div>
                              <div className="border border-black p-2 flex-1 grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <p className="font-black">Fiscalizador</p>
                                  <p className="font-black">Posto/Grad.</p>
                                  <p className="font-black">Matr/Func</p>
                                </div>
                                <div className="space-y-1 text-center">
                                  {formData.inspectors?.[0] && (
                                    <>
                                      <div className="h-10 flex items-center justify-center border-b border-stone-200">
                                        {formData.signatures?.inspectors?.[0] && <img src={formData.signatures.inspectors[0]} className="max-h-full grayscale" alt="Assinatura" />}
                                      </div>
                                      <p className="font-medium border-b border-stone-100">{formData.inspectors[0].rank}</p>
                                      <p className="font-medium">{formData.inspectors[0].registration}</p>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <div className="flex border-b border-black mb-2">
                                <span className="font-black mr-2">Data:</span>
                                <span className="font-medium">{format(new Date(), "dd / MM / yyyy")}</span>
                              </div>
                              <div className="border border-black p-2 flex-1 grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <p className="font-black">Fiscalizador</p>
                                  <p className="font-black">Posto/Grad.</p>
                                  <p className="font-black">Matr/Func</p>
                                </div>
                                <div className="space-y-1 text-center">
                                  {formData.inspectors?.[1] && (
                                    <>
                                      <div className="h-10 flex items-center justify-center border-b border-stone-200">
                                        {formData.signatures?.inspectors?.[1] && <img src={formData.signatures.inspectors[1]} className="max-h-full grayscale" alt="Assinatura" />}
                                      </div>
                                      <p className="font-medium border-b border-stone-100">{formData.inspectors[1].rank}</p>
                                      <p className="font-medium">{formData.inspectors[1].registration}</p>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="text-[9px] text-center mt-4 border-t border-stone-200 pt-2 space-y-0.5">
                            <p className="font-bold">Rua Appa, 21 - Vila do Prata - CEP 79150-000 - Fone: (67) 3454-4141</p>
                            <p>Horário de expediente administrativo: de 2ª à 6ª feira - das 7h30 às 12h00 e das 14h00 às 17h30</p>
                            <p>E-mail: maracaju.sal@cbm.ms.gov.br</p>
                          </div>
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
