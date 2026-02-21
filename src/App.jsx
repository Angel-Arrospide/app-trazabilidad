import React, { useState, useMemo, useRef } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Network, 
  ShieldAlert, 
  ChevronRight,
  ChevronDown,
  GitCommit,
  Lock,
  Unlock,
  XCircle,
  AlertCircle,
  Download,
  Upload,
  Printer,
  BookOpen,
  Image as ImageIcon,
  FileCode2
} from 'lucide-react';

export default function App() {
  // Estados principales
  const [situations, setSituations] = useState([]);
  const [testCases, setTestCases] = useState([]);
  const [activeTab, setActiveTab] = useState('situations'); 
  const [expandedNodes, setExpandedNodes] = useState(new Set()); 

  // Estados de formularios y errores
  const [sitId, setSitId] = useState('');
  const [sitDesc, setSitDesc] = useState('');
  const [sitInvalid, setSitInvalid] = useState(false);
  const [sitError, setSitError] = useState('');

  const [tcId, setTcId] = useState('');
  const [tcFails, setTcFails] = useState(false);
  const [tcLinkedSits, setTcLinkedSits] = useState([]);
  const [tcError, setTcError] = useState('');

  const fileInputRef = useRef(null);
  const svgRef = useRef(null); // Referencia al gráfico para exportar

  // Lógica de jerarquía
  const leafSituations = useMemo(() => {
    return situations.filter(sit => !situations.some(other => other.id.startsWith(sit.id + '.')));
  }, [situations]);

  const uncoveredSituations = useMemo(() => {
    const coveredIds = new Set(testCases.flatMap(tc => tc.situations));
    return leafSituations.filter(s => !coveredIds.has(s.id));
  }, [leafSituations, testCases]);

  const hasSituations = leafSituations.length > 0;
  const isAllCovered = hasSituations && uncoveredSituations.length === 0;

  // --- LÓGICA DE EXPANSIÓN ---
  const getParentIds = (id) => {
    const parts = id.split('.');
    const parents = [];
    for (let i = 1; i < parts.length; i++) {
      parents.push(parts.slice(0, i).join('.'));
    }
    return parents;
  };

  const isVisible = (id) => {
    const parents = getParentIds(id);
    return parents.every(p => expandedNodes.has(p));
  };

  const toggleExpand = (id) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // --- LÓGICA DE EXPORTACIÓN JSON ---
  const handleExportData = () => {
    const data = { situations, testCases };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "trazabilidad_datos.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportData = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data.situations) && Array.isArray(data.testCases)) {
          setSituations(data.situations);
          setTestCases(data.testCases);
        } else {
          alert("El archivo JSON no tiene el formato correcto.");
        }
      } catch (error) {
        alert("Error al leer o procesar el archivo JSON.");
      }
    };
    reader.readAsText(file);
    event.target.value = null; 
  };

  const handleLoadExample = () => {
    const hasData = situations.length > 0 || testCases.length > 0;
    if (hasData && !window.confirm("¿Estás seguro de cargar el ejemplo? Se borrarán los datos actuales no exportados.")) {
      return;
    }
    
    const exampleData = {
      "situations": [
        { "id": "1", "description": "Sexo", "invalid": false },
        { "id": "1.1", "description": "Hombre", "invalid": false },
        { "id": "1.2", "description": "Mujer", "invalid": false },
        { "id": "1.3", "description": "Otro", "invalid": true },
        { "id": "2", "description": "Edad", "invalid": false },
        { "id": "2.1", "description": "Junior", "invalid": false },
        { "id": "2.2", "description": "Senior", "invalid": false },
        { "id": "2.3", "description": "Otro", "invalid": true }
      ],
      "testCases": [
        { "id": "C1", "fails": false, "situations": ["1.1", "2.1"] },
        { "id": "C2", "fails": false, "situations": ["1.2", "2.2"] },
        { "id": "C3", "fails": true, "situations": ["1.3"] },
        { "id": "C4", "fails": false, "situations": ["2.3"] },
        { "id": "C5", "fails": true, "situations": ["1.1", "2.2"] }
      ]
    };

    setSituations(exampleData.situations);
    setTestCases(exampleData.testCases);
    setExpandedNodes(new Set(['1', '2'])); 
    setActiveTab('situations'); 
  };

  // --- LÓGICA DE EXPORTACIÓN GRÁFICO (SVG/PNG) ---
  const handleExportSVG = () => {
    if (!svgRef.current) return;
    const clone = svgRef.current.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const svgData = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trazabilidad_grafico.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPNG = () => {
    if (!svgRef.current) return;
    const clone = svgRef.current.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const svgData = new XMLSerializer().serializeToString(clone);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Dimensiones originales x2 para mayor resolución
    const width = parseInt(svgRef.current.getAttribute('width'));
    const height = parseInt(svgRef.current.getAttribute('height'));
    canvas.width = width * 2;
    canvas.height = height * 2;
    
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
      ctx.fillStyle = '#f8fafc'; // bg-slate-50
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(2, 2); // Escala para alta definición
      ctx.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = 'trazabilidad_grafico.png';
      a.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // Manejadores de Situaciones
  const handleAddSituation = (e) => {
    e.preventDefault();
    setSitError('');
    if (!sitId.trim() || !sitDesc.trim()) return;
    
    if (situations.some(s => s.id === sitId.trim())) {
      setSitError("El ID de la situación ya existe. Por favor, usa uno único.");
      return;
    }
    
    const newSituations = [...situations, { id: sitId.trim(), description: sitDesc, invalid: sitInvalid }];
    newSituations.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
    
    setSituations(newSituations);
    const parents = getParentIds(sitId.trim());
    setExpandedNodes(new Set(parents));

    setSitId('');
    setSitDesc('');
    setSitInvalid(false);
  };

  const handleDeleteSituation = (id) => {
    const isParent = situations.some(s => s.id.startsWith(id + '.'));
    if (isParent && !window.confirm("Esta situación tiene sub-situaciones. ¿Seguro que quieres borrarla? Se recomienda borrar primero los hijos.")) {
      return;
    }
    
    setSituations(situations.filter(s => s.id !== id));
    setTestCases(testCases.map(tc => ({
      ...tc,
      situations: tc.situations.filter(sid => sid !== id)
    })));
  };

  // Manejadores de Casos de Prueba
  const handleAddTestCase = (e) => {
    e.preventDefault();
    setTcError('');
    if (!tcId.trim() || tcLinkedSits.length === 0) return;
    
    if (testCases.some(tc => tc.id === tcId.trim())) {
      setTcError("El ID del caso de prueba ya existe. Por favor, usa uno único.");
      return;
    }

    const invalidSelected = situations.filter(s => tcLinkedSits.includes(s.id) && s.invalid);
    
    if (invalidSelected.length > 0 && tcLinkedSits.length > 1) {
      setTcError("Un caso de prueba que cubre una situación inválida solo puede cubrir esa situación y ninguna más.");
      return;
    }

    if (invalidSelected.some(s => testCases.some(tc => tc.situations.includes(s.id)))) {
      setTcError("Una situación inválida solo puede asociarse a 1 caso de prueba.");
      return;
    }

    setTestCases([...testCases, { id: tcId.trim(), fails: tcFails, situations: tcLinkedSits }]);
    setTcId('');
    setTcFails(false);
    setTcLinkedSits([]);
  };

  const handleDeleteTestCase = (id) => {
    setTestCases(testCases.filter(tc => tc.id !== id));
  };

  const toggleTestCaseSituation = (sitId) => {
    setTcLinkedSits(prev => 
      prev.includes(sitId) ? prev.filter(id => id !== sitId) : [...prev, sitId]
    );
  };

  // Configuración del Gráfico SVG Puro (Preparado para exportar sin perder estilos)
  const renderGraph = () => {
    const nodeWidth = 260;
    const nodeHeight = 80;
    const verticalGap = 24;
    
    const leftColX = 30; // Situaciones
    const rightColX = 550; // Casos de Prueba
    const svgWidth = 840;

    const maxItems = Math.max(leafSituations.length, testCases.length);
    const svgHeight = Math.max(400, maxItems * (nodeHeight + verticalGap) + 40);

    const getSituationStatus = (sitId) => {
      const linkedTCs = testCases.filter(tc => tc.situations.includes(sitId));
      if (linkedTCs.length === 0) return 'green';
      const allFail = linkedTCs.every(tc => tc.fails === true);
      return allFail ? 'red' : 'green';
    };

    return (
      <div className="w-full overflow-x-auto bg-slate-50 border border-slate-200 rounded-xl shadow-inner p-4 mt-6 print:border-none print:shadow-none print:mt-0 print:overflow-visible flex justify-center">
        <svg 
          ref={svgRef} 
          width={svgWidth} 
          height={svgHeight} 
          className="bg-slate-50 print:bg-transparent"
          style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }} // Fuerza fuente en exportación
        >
          <defs>
            <marker id="arrowhead-red" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
            </marker>
            <marker id="arrowhead-green" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" />
            </marker>
          </defs>

          {/* Dibuja las líneas (aristas) */}
          {testCases.map((tc, cIndex) => {
            const startY = 20 + cIndex * (nodeHeight + verticalGap) + (nodeHeight / 2);
            const pathColor = tc.fails ? '#fca5a5' : '#6ee7b7'; 
            const hoverColor = tc.fails ? '#ef4444' : '#10b981'; 
            const marker = tc.fails ? 'url(#arrowhead-red)' : 'url(#arrowhead-green)';
            
            return tc.situations.map(sitId => {
              const sIndex = leafSituations.findIndex(s => s.id === sitId);
              if (sIndex === -1) return null; 

              const endY = 20 + sIndex * (nodeHeight + verticalGap) + (nodeHeight / 2);
              
              const startX = rightColX; 
              const endX = leftColX + nodeWidth; 

              const cp1X = startX - 80;
              const cp1Y = startY;
              const cp2X = endX + 80;
              const cp2Y = endY;

              return (
                <path
                  key={`${tc.id}-${sitId}`}
                  d={`M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX + 6} ${endY}`}
                  fill="none"
                  stroke={pathColor}
                  strokeWidth="2"
                  markerEnd={marker}
                  onMouseEnter={(e) => { e.target.setAttribute('stroke', hoverColor); e.target.setAttribute('stroke-width', '3'); }}
                  onMouseLeave={(e) => { e.target.setAttribute('stroke', pathColor); e.target.setAttribute('stroke-width', '2'); }}
                  style={{ cursor: 'pointer', transition: 'stroke 0.3s' }}
                />
              );
            });
          })}

          {/* Renderiza Situaciones Último Nivel (Izquierda) */}
          {leafSituations.map((sit, index) => {
            const status = getSituationStatus(sit.id);
            const isRed = status === 'red';
            const borderColor = isRed ? '#fca5a5' : '#6ee7b7';
            const titleColor = isRed ? '#b91c1c' : '#047857';
            const tagBg = isRed ? '#fef2f2' : '#ecfdf5';
            const tagColor = isRed ? '#dc2626' : '#059669';
            const tagText = isRed ? 'Falla en todas' : 'Cubierta';
            const y = 20 + index * (nodeHeight + verticalGap);

            return (
              <g key={`sit-${sit.id}`} transform={`translate(${leftColX}, ${y})`}>
                <rect width={nodeWidth} height={nodeHeight} rx="8" fill="#ffffff" stroke={borderColor} strokeWidth="2" />
                <text x="16" y="28" fontSize="14" fontWeight="bold" fill={titleColor}>{sit.id}</text>
                
                {sit.invalid && (
                  <g transform={`translate(${16 + sit.id.length * 9 + 10}, 23)`}>
                    <circle cx="0" cy="0" r="8" fill="#e2e8f0" />
                    <text x="0" y="4" fontSize="10" fontWeight="bold" fill="#334155" textAnchor="middle">i</text>
                  </g>
                )}

                {/* Etiqueta */}
                <rect x={nodeWidth - 96} y="14" width="84" height="20" rx="10" fill={tagBg} />
                <text x={nodeWidth - 54} y="28" fontSize="10" fontWeight="bold" fill={tagColor} textAnchor="middle">{tagText}</text>
                
                {/* Descripción */}
                <text x="16" y="58" fontSize="12" fill="#475569">
                  {sit.description.length > 32 ? sit.description.substring(0, 30) + '...' : sit.description}
                </text>
              </g>
            );
          })}

          {/* Renderiza Casos de Prueba (Derecha) */}
          {testCases.map((tc, index) => {
            const isRed = tc.fails;
            const borderColor = isRed ? '#fca5a5' : '#6ee7b7';
            const titleColor = isRed ? '#b91c1c' : '#047857';
            const tagBg = isRed ? '#fef2f2' : '#ecfdf5';
            const tagColor = isRed ? '#dc2626' : '#059669';
            const statusText = isRed ? 'Caso Fallido' : 'Caso Exitoso';
            const y = 20 + index * (nodeHeight + verticalGap);

            return (
              <g key={`tc-${tc.id}`} transform={`translate(${rightColX}, ${y})`}>
                <rect width={nodeWidth} height={nodeHeight} rx="8" fill="#ffffff" stroke={borderColor} strokeWidth="2" />
                <text x="16" y="28" fontSize="14" fontWeight="bold" fill={titleColor}>{tc.id}</text>
                
                {/* Etiqueta situaciones */}
                <rect x={nodeWidth - 80} y="14" width="68" height="20" rx="10" fill={tagBg} />
                <text x={nodeWidth - 46} y="28" fontSize="10" fontWeight="bold" fill={tagColor} textAnchor="middle">{tc.situations.length} sit.</text>
                
                {/* Status Inferior */}
                {isRed ? (
                  <svg x="16" y="46" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={tagColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                ) : (
                  <svg x="16" y="46" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={tagColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                )}
                <text x="36" y="58" fontSize="12" fontWeight="bold" fill={tagColor}>{statusText}</text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white md:bg-slate-50 text-slate-800 font-sans p-4 md:p-8 print:bg-white print:p-0">
      {/* Contenedor principal expandido a 1400px de máximo */}
      <div className="max-w-[1400px] mx-auto space-y-6 w-full">
        
        {/* Header */}
        <header className="mb-8 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6 print:hidden">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Trazabilidad de Pruebas</h1>
            <p className="text-slate-500 mt-1">Gestión anidada de situaciones y validación de cobertura</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={handleLoadExample}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors shadow-sm"
            >
              <BookOpen size={16} /> Cargar Ejemplo
            </button>
            <input 
              type="file" 
              accept=".json" 
              ref={fileInputRef} 
              onChange={handleImportData} 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Upload size={16} /> Importar
            </button>
            <button 
              onClick={handleExportData}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Download size={16} /> Exportar JSON
            </button>
          </div>
        </header>

        {/* Global Warning Banner */}
        {uncoveredSituations.length > 0 && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm flex items-start gap-3 print:hidden">
            <ShieldAlert className="text-amber-500 mt-0.5 flex-shrink-0" size={24} />
            <div>
              <h3 className="text-amber-800 font-bold">¡Atención! Situaciones de último nivel sin cubrir</h3>
              <p className="text-amber-700 text-sm mt-1">
                Falta cubrir {uncoveredSituations.length} situación(es) hoja para completar la trazabilidad.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {uncoveredSituations.map(s => (
                  <span key={s.id} className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-md font-medium">
                    {s.id}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {isAllCovered && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg shadow-sm flex items-center gap-3 text-emerald-800 print:hidden">
            <CheckCircle2 className="text-emerald-500" size={24} />
            <div>
              <h3 className="font-bold">¡Cobertura del 100%!</h3>
              <p className="text-sm">Todas las situaciones de último nivel tienen casos de prueba asociados. El gráfico está desbloqueado.</p>
            </div>
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 bg-slate-200/50 p-1.5 rounded-xl print:hidden">
          <button 
            onClick={() => setActiveTab('situations')} 
            className={`flex-1 py-3 px-4 text-sm font-bold rounded-lg transition-all flex justify-center items-center gap-2 ${activeTab === 'situations' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'}`}
          >
            <AlertTriangle size={18} /> 1. Situaciones de Prueba
          </button>
          <button 
            onClick={() => setActiveTab('testCases')} 
            className={`flex-1 py-3 px-4 text-sm font-bold rounded-lg transition-all flex justify-center items-center gap-2 ${activeTab === 'testCases' ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'}`}
          >
            <CheckCircle2 size={18} /> 2. Casos de Prueba
          </button>
          <button 
            onClick={() => isAllCovered && setActiveTab('graph')} 
            disabled={!isAllCovered}
            className={`flex-1 py-3 px-4 text-sm font-bold rounded-lg transition-all flex justify-center items-center gap-2 ${activeTab === 'graph' ? 'bg-white text-purple-700 shadow-sm border border-slate-200/50' : isAllCovered ? 'text-slate-600 hover:text-purple-600 hover:bg-slate-200/70' : 'text-slate-400 cursor-not-allowed'}`}
          >
            <Network size={18} /> 3. Gráfico Trazabilidad
            {isAllCovered ? <Unlock size={14} className="ml-1" /> : <Lock size={14} className="ml-1" />}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full print:hidden">
          
          {/* TAB 1: Situaciones */}
          <div className={`lg:col-span-12 space-y-6 ${activeTab !== 'situations' && 'hidden'}`}>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold mb-4">Añadir Situación de Prueba</h2>
              
              {sitError && (
                <div className="mb-4 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 text-sm font-medium">
                  <AlertCircle size={18} /> {sitError}
                </div>
              )}

              <form onSubmit={handleAddSituation} className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="w-full md:w-1/4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">ID (Usa puntos para anidar)</label>
                    <input required type="text" value={sitId} onChange={e => {setSitId(e.target.value); setSitError('');}} placeholder="Ej. 1, 1.1, 1.1.2" className={`w-full px-3 py-2 border rounded-lg outline-none transition-all bg-white text-slate-900 ${sitError ? 'border-red-400 focus:ring-red-500' : 'border-slate-300 focus:ring-2 focus:ring-indigo-500'}`} />
                  </div>
                  <div className="w-full md:w-1/2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                    <input required type="text" value={sitDesc} onChange={e => setSitDesc(e.target.value)} placeholder="Ej. Hombre, Mujer, etc." className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-slate-900" />
                  </div>
                  <div className="w-full md:w-auto flex items-center gap-3 mb-1 h-10">
                    <label className="flex items-center gap-2 cursor-pointer px-3 hover:bg-slate-50 rounded-lg h-full border border-slate-200 transition-colors bg-white">
                      <input type="checkbox" checked={sitInvalid} onChange={e => setSitInvalid(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                      <span className="font-medium text-sm text-slate-700">¿Inválida?</span>
                    </label>
                    <button type="submit" className="flex-shrink-0 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-medium transition-colors h-full shadow-sm">
                      <Plus size={20} /> Añadir
                    </button>
                  </div>
                </div>
              </form>
              <p className="text-xs text-slate-500 mt-3">Las situaciones "hoja" (sin hijos) se considerarán automáticamente como "Último nivel".</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 font-semibold text-slate-700">Listado de Situaciones</div>
              <div className="p-4 space-y-2">
                {situations.length === 0 ? (
                  <p className="text-center text-slate-400 py-6">No hay situaciones. Añade la primera arriba.</p>
                ) : (
                  situations.map(sit => {
                    if (!isVisible(sit.id)) return null;

                    const isLeaf = leafSituations.some(l => l.id === sit.id);
                    const isUncovered = isLeaf && uncoveredSituations.some(u => u.id === sit.id);
                    const indentCount = (sit.id.match(/\./g) || []).length;

                    return (
                      <div key={sit.id} style={{ marginLeft: `${indentCount * 1.5}rem` }} className={`p-3 rounded-lg border flex justify-between items-center transition-all ${isUncovered ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-slate-200 hover:border-indigo-300'}`}>
                        <div className="flex items-center gap-3">
                          {indentCount > 0 && <GitCommit className="text-slate-300 rotate-90" size={16} />}
                          
                          {!isLeaf && (
                            <button onClick={() => toggleExpand(sit.id)} className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors">
                              {expandedNodes.has(sit.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          )}

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">{sit.id}</span>
                              {sit.invalid && <span className="flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold" title="Situación Inválida">i</span>}
                              {isLeaf ? (
                                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">Último Nivel</span>
                              ) : (
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Padre</span>
                              )}
                              {isUncovered && <span className="text-[10px] text-amber-600 font-bold bg-amber-100 px-2 py-0.5 rounded-full">Falta Cubrir</span>}
                            </div>
                            <p className="text-sm text-slate-600 mt-0.5">{sit.description}</p>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteSituation(sit.id)} className="text-slate-400 hover:text-red-500 transition-colors p-2">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* TAB 2: Casos de Prueba */}
          <div className={`lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-6 ${activeTab !== 'testCases' && 'hidden'}`}>
            <div className="lg:col-span-5 h-fit bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold mb-4">Añadir Caso de Prueba</h2>
              
              {tcError && (
                <div className="mb-4 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 text-sm font-medium">
                  <AlertCircle size={18} /> {tcError}
                </div>
              )}

              <form onSubmit={handleAddTestCase} className="space-y-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ID Caso de Prueba</label>
                    <input required type="text" value={tcId} onChange={e => {setTcId(e.target.value.toUpperCase()); setTcError('');}} placeholder="Ej. CP-01" className={`w-full px-3 py-2 border rounded-lg outline-none transition-all bg-white text-slate-900 ${tcError ? 'border-red-400 focus:ring-red-500' : 'border-slate-300 focus:ring-2 focus:ring-emerald-500'}`} />
                  </div>
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg transition-colors w-full shadow-sm">
                      <input 
                        type="checkbox" 
                        checked={tcFails} 
                        onChange={e => setTcFails(e.target.checked)} 
                        className="w-5 h-5 text-red-600 rounded border-slate-300 focus:ring-red-500" 
                      />
                      <span className="font-medium text-slate-700">¿Este caso de prueba FALLA?</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Asociar a Situaciones de Último Nivel</label>
                  {situations.length === 0 ? (
                    <p className="text-sm text-slate-500 italic p-3 bg-slate-50 rounded-lg border border-slate-200">Crea situaciones primero en la pestaña 1.</p>
                  ) : (
                    <div className="max-h-72 overflow-y-auto space-y-1 border border-slate-200 rounded-lg p-2 bg-slate-50 shadow-inner">
                      {(() => {
                        const hasInvalidSelected = tcLinkedSits.some(id => situations.find(s => s.id === id)?.invalid);
                        const hasNormalSelected = tcLinkedSits.some(id => !situations.find(s => s.id === id)?.invalid);
                        
                        return situations.map(sit => {
                          if (!isVisible(sit.id)) return null;

                          const isLeaf = leafSituations.some(l => l.id === sit.id);
                          const indentCount = (sit.id.match(/\./g) || []).length;
                          const isInvalid = sit.invalid;
                          const alreadyCovered = isInvalid && testCases.some(tc => tc.situations.includes(sit.id));
                          
                          let isDisabled = !isLeaf || alreadyCovered;
                          let disableReason = alreadyCovered ? "Ya cubierta (Max 1)" : "";

                          if (!isDisabled) {
                            if (hasInvalidSelected && !tcLinkedSits.includes(sit.id)) {
                              isDisabled = true;
                              disableReason = "Exclusivo (1 inválida)";
                            } else if (hasNormalSelected && isInvalid) {
                              isDisabled = true;
                              disableReason = "No combinable";
                            }
                          }
                          
                          return (
                            <div key={sit.id} style={{ marginLeft: `${indentCount * 1.5}rem` }} className={`flex items-center gap-2 p-2 rounded transition-colors ${!isDisabled ? 'hover:bg-white bg-slate-50/50 border border-transparent hover:border-slate-200 shadow-sm' : 'opacity-60'}`}>
                              
                              {!isLeaf ? (
                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleExpand(sit.id); }} className="p-0.5 hover:bg-slate-200 rounded text-slate-500 transition-colors shrink-0 z-10 relative">
                                  {expandedNodes.has(sit.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </button>
                              ) : (
                                <div className="w-5 shrink-0" />
                              )}

                              <label className={`flex items-center gap-2 w-full m-0 ${!isDisabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                                <input 
                                  type="checkbox" 
                                  disabled={isDisabled}
                                  checked={tcLinkedSits.includes(sit.id)}
                                  onChange={() => toggleTestCaseSituation(sit.id)}
                                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 disabled:opacity-50"
                                />
                                <span className="text-sm font-bold text-slate-700">{sit.id}</span>
                                {isInvalid && <span className="flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold" title="Situación Inválida">i</span>}
                                <span className="text-sm text-slate-600 truncate">- {sit.description}</span>
                                {!isLeaf && <span className="text-[10px] ml-auto text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded hidden sm:inline-block">Nodo Padre</span>}
                                {disableReason && <span className="text-[10px] ml-auto text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded font-medium">{disableReason}</span>}
                              </label>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>

                {(() => {
                  const alreadyCoveredInForm = tcLinkedSits.filter(id => testCases.some(tc => tc.situations.includes(id)));
                  if (alreadyCoveredInForm.length === 0) return null;
                  return (
                    <div className="text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200 text-sm font-medium flex gap-2 items-start mt-2">
                      <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                      <span>Aviso: Las situaciones <strong>{alreadyCoveredInForm.join(', ')}</strong> ya están cubiertas por otros casos.</span>
                    </div>
                  );
                })()}

                <button 
                  type="submit" 
                  disabled={situations.length === 0 || tcLinkedSits.length === 0}
                  className="w-full flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-bold transition-colors shadow-sm"
                >
                  <Plus size={18} /> Guardar Caso de Prueba
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 font-semibold text-slate-700">Listado de Casos de Prueba</div>
              <div className="p-4 space-y-3 h-[600px] overflow-y-auto">
                {testCases.length === 0 ? (
                  <p className="text-center text-slate-400 py-10">No hay casos de prueba. Añade el primero en la columna izquierda.</p>
                ) : (
                  testCases.map(tc => {
                    const isRedundant = tc.situations.length > 0 && tc.situations.every(sitId => 
                      testCases.some(otherTc => otherTc.id !== tc.id && otherTc.situations.includes(sitId))
                    );

                    return (
                      <div key={tc.id} className={`p-4 rounded-lg border flex justify-between items-start transition-all ${tc.fails ? 'bg-red-50/30 border-red-200 hover:border-red-300' : 'bg-white border-slate-200 hover:border-emerald-300'}`}>
                        <div className="w-full pr-4">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-bold text-slate-800 text-lg">{tc.id}</span>
                            <span className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${tc.fails ? 'bg-red-100 text-red-700 border-red-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                              {tc.fails ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                              {tc.fails ? 'Falla' : 'Pasa'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {tc.situations.map(sitId => (
                              <span key={sitId} className="flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-md border border-slate-200">
                                <ChevronRight size={12} /> {sitId}
                              </span>
                            ))}
                          </div>
                          {isRedundant && (
                            <div className="mt-3 flex items-start gap-1.5 text-amber-700 bg-amber-50 px-3 py-2 rounded-md border border-amber-200 text-xs font-medium">
                              <AlertTriangle size={16} className="flex-shrink-0" />
                              <span>Caso redundante: Todas sus situaciones ya están cubiertas por otros casos.</span>
                            </div>
                          )}
                        </div>
                        <button onClick={() => handleDeleteTestCase(tc.id)} className="text-slate-400 hover:text-red-500 transition-colors p-2 bg-slate-50 hover:bg-red-50 rounded-lg">
                          <Trash2 size={20} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* TAB 3: Gráfico (Siempre visible aquí y oculto si no se cumple, fuera de los grids para poder ocupar el 100%) */}
        {activeTab === 'graph' && isAllCovered && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
            <div className="flex flex-wrap justify-end gap-3 mb-4 print:hidden">
              <button 
                onClick={handleExportPNG}
                className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <ImageIcon size={16} /> Descargar PNG
              </button>
              <button 
                onClick={handleExportSVG}
                className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <FileCode2 size={16} /> Descargar SVG
              </button>
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <Printer size={16} /> Imprimir A4
              </button>
            </div>
            {renderGraph()}
            <div className="text-center mt-6 text-sm text-slate-500 print:hidden bg-white p-4 rounded-xl border border-slate-200 shadow-sm inline-block mx-auto">
              <span className="inline-flex items-center gap-1.5 text-red-600 font-medium mr-6"><XCircle size={16}/> Rojo: Casos fallidos o Situaciones sin casos exitosos</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium"><CheckCircle2 size={16}/> Verde: Casos exitosos o Situaciones con al menos un caso exitoso</span>
            </div>
          </div>
        )}

        {/* Footer / Disclaimer Legal */}
        <footer className="mt-16 pb-8 border-t border-slate-200 pt-8 text-center text-xs text-slate-400 print:hidden w-full">
          <p className="font-semibold text-slate-500 mb-2">© 2026 Angel Arrospide</p>
          <p className="max-w-4xl mx-auto leading-relaxed px-4">
            El software se proporciona "tal cual", sin garantía de ningún tipo, expresa o implícita, incluyendo pero no limitándose a garantías de comerciabilidad, idoneidad para un propósito particular y no infracción. En ningún caso el autor será responsable de ninguna reclamación, daño u otra responsabilidad, ya sea en una acción de contrato, agravio o de otro tipo, que surja de, o en conexión con el software o el uso u otros tratos en el mismo.
          </p>
        </footer>

      </div>
    </div>
  );
}