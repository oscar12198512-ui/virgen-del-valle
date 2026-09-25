import React, { useState, useRef } from 'react';
import {
  Utensils,
  Plus,
  Trash2,
  Edit3,
  Camera,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Tag,
  Search,
  Check,
  X,
  Sparkles,
  Layers,
  ChevronDown,
  RefreshCw,
  Eye,
  EyeOff,
  Flame,
  Smartphone
} from 'lucide-react';
import { MenuItem } from '../types';
import { soundService } from '../services/soundService';

interface OwnerMenuManagerProps {
  menuItems: MenuItem[];
  bcvRate: number;
  onToggleMenuAvailability: (itemId: string) => void;
  onAddMenuItem: (newItem: MenuItem) => void;
  onUpdateMenuItem: (updatedItem: MenuItem) => void;
  onDeleteMenuItem: (itemId: string) => void;
}

// Preset photo collection for Playa Buche quick pick
const PRESET_PHOTOS = [
  {
    label: 'Pargo Rojo Crispy',
    url: 'https://images.unsplash.com/photo-1534939561126-855b8675edd7?auto=format&fit=crop&w=800&q=80',
    category: 'pescados',
  },
  {
    label: 'Ceviche Marinero',
    url: 'https://images.unsplash.com/photo-1535400255456-984241443b29?auto=format&fit=crop&w=800&q=80',
    category: 'mariscos',
  },
  {
    label: 'Paella a la Brasa',
    url: 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&w=800&q=80',
    category: 'mariscos',
  },
  {
    label: 'Fosforera de Mariscos',
    url: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
    category: 'mariscos',
  },
  {
    label: 'Tostones con Queso',
    url: 'https://images.unsplash.com/photo-1582169296194-e4d644c48063?auto=format&fit=crop&w=800&q=80',
    category: 'entradas',
  },
  {
    label: 'Empanadas de Cazón',
    url: 'https://images.unsplash.com/photo-1628294895950-9805252327bc?auto=format&fit=crop&w=800&q=80',
    category: 'entradas',
  },
  {
    label: 'Calamares Rebozados',
    url: 'https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=800&q=80',
    category: 'entradas',
  },
  {
    label: 'Coco Loco Buche',
    url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
    category: 'bebidas',
  },
  {
    label: 'Cerveza Fría Polar',
    url: 'https://images.unsplash.com/photo-1608270114001-2a2b724580bf?auto=format&fit=crop&w=800&q=80',
    category: 'bebidas',
  },
  {
    label: 'Cocada Playera',
    url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80',
    category: 'postres',
  },
];

type CategoryFilter = 'all' | 'pescados' | 'mariscos' | 'entradas' | 'bebidas' | 'postres' | 'out_of_stock';

export const OwnerMenuManager: React.FC<OwnerMenuManagerProps> = ({
  menuItems,
  bcvRate,
  onToggleMenuAvailability,
  onAddMenuItem,
  onUpdateMenuItem,
  onDeleteMenuItem,
}) => {
  const [menuChannelFilter, setMenuChannelFilter] = useState<'all' | 'waiters' | 'excursions'>('all');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<MenuItem['category']>('pescados');
  const [formMenuTarget, setFormMenuTarget] = useState<'all' | 'waiters' | 'excursions'>('all');
  const [formPriceUsd, setFormPriceUsd] = useState('');
  const [formPriceExcursionUsd, setFormPriceExcursionUsd] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formEstimatedMinutes, setFormEstimatedMinutes] = useState('15-20 min');
  const [formServingSize, setFormServingSize] = useState('Ración individual ~600g');
  const [formTag, setFormTag] = useState('Pesca del Día');
  const [formIsAvailable, setFormIsAvailable] = useState(true);
  const [formWaiterShareUsd, setFormWaiterShareUsd] = useState('2.00'); // Monto por plato para mesonero

  // Direct Phone Camera & Upload
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [showPresetPicker, setShowPresetPicker] = useState(false);

  const showNotice = (msg: string) => {
    setNoticeMessage(msg);
    setTimeout(() => setNoticeMessage(null), 4000);
  };

  // Helper to format currency
  const formatUsd = (val: number) => `$${val.toFixed(2)}`;
  const formatBs = (valUsd: number) => `${(valUsd * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.`;

  // Open modal in create mode
  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormName('');
    setFormCategory('pescados');
    setFormMenuTarget('all');
    setFormPriceUsd('22.00');
    setFormPriceExcursionUsd('18.00');
    setFormWaiterShareUsd('2.00');
    setFormDescription('');
    setFormImageUrl(PRESET_PHOTOS[0].url);
    setFormEstimatedMinutes('15-20 min');
    setFormServingSize('Ración individual ~600g');
    setFormTag('Especial Buche');
    setFormIsAvailable(true);
    setShowPresetPicker(false);
    setIsModalOpen(true);
  };

  // Open modal in edit mode
  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormMenuTarget(item.menuTarget || 'all');
    setFormPriceUsd(item.priceUsd.toString());
    setFormPriceExcursionUsd(
      item.priceExcursionUsd !== undefined ? item.priceExcursionUsd.toString() : item.priceUsd.toString()
    );
    setFormWaiterShareUsd(item.waiterShareUsd !== undefined ? item.waiterShareUsd.toString() : '0.00');
    setFormDescription(item.description);
    setFormImageUrl(item.imageUrl);
    setFormEstimatedMinutes(item.estimatedMinutes || '15-20 min');
    setFormServingSize(item.servingSize || 'Ración individual');
    setFormTag(item.tag || '');
    setFormIsAvailable(item.isAvailable);
    setShowPresetPicker(false);
    setIsModalOpen(true);
  };

  // Process image from phone camera or file picker with client-side canvas compression
  const handleProcessImageFile = (file: File) => {
    if (!file) return;
    setIsProcessingImage(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress & scale to max 1000px so it is fast and ultra responsive on mobile
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setFormImageUrl(compressedDataUrl);
          soundService.playSuccess();
          showNotice('¡Foto capturada y procesada con éxito desde el teléfono!');
        }
        setIsProcessingImage(false);
      };
      img.onerror = () => {
        setIsProcessingImage(false);
        showNotice('Error al procesar la imagen del teléfono.');
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setIsProcessingImage(false);
      showNotice('Error al leer el archivo desde el dispositivo.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessImageFile(e.target.files[0]);
    }
  };

  // Submit Add or Edit Form
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showNotice('Por favor escribe el nombre del plato.');
      return;
    }
    const parsedPrice = parseFloat(formPriceUsd);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      showNotice('Por favor ingresa un precio válido en USD para el plato.');
      return;
    }

    const parsedExcursionPrice = parseFloat(formPriceExcursionUsd);
    const finalExcursionPrice = !isNaN(parsedExcursionPrice) && parsedExcursionPrice > 0
      ? parsedExcursionPrice
      : parsedPrice;

    const parsedWaiterShare = Math.max(0, parseFloat(formWaiterShareUsd) || 0);

    const finalImageUrl = formImageUrl || PRESET_PHOTOS[0].url;

    if (editingItem) {
      // Update existing item
      const updated: MenuItem = {
        ...editingItem,
        name: formName.trim(),
        category: formCategory,
        menuTarget: formMenuTarget,
        priceUsd: parsedPrice,
        priceExcursionUsd: finalExcursionPrice,
        waiterShareUsd: parsedWaiterShare,
        description: formDescription.trim(),
        imageUrl: finalImageUrl,
        estimatedMinutes: formEstimatedMinutes.trim(),
        servingSize: formServingSize.trim(),
        tag: formTag.trim() || undefined,
        isAvailable: formIsAvailable,
      };
      onUpdateMenuItem(updated);
      showNotice(`Plato "${updated.name}" actualizado con éxito con precios para Mesoneros y Excursiones.`);
    } else {
      // Create new item
      const newItem: MenuItem = {
        id: 'm-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        name: formName.trim(),
        category: formCategory,
        menuTarget: formMenuTarget,
        priceUsd: parsedPrice,
        priceExcursionUsd: finalExcursionPrice,
        waiterShareUsd: parsedWaiterShare,
        description: formDescription.trim(),
        imageUrl: finalImageUrl,
        estimatedMinutes: formEstimatedMinutes.trim(),
        servingSize: formServingSize.trim(),
        tag: formTag.trim() || undefined,
        isAvailable: formIsAvailable,
      };
      onAddMenuItem(newItem);
      showNotice(`¡Plato "${newItem.name}" agregado a la carta de Playa Buche!`);
    }

    setIsModalOpen(false);
  };

  // Toggle availability with sound & message
  const handleToggle = (item: MenuItem) => {
    onToggleMenuAvailability(item.id);
    if (item.isAvailable) {
      soundService.playBell();
      showNotice(`"${item.name}" retirado del menú (Marcado como AGOTADO).`);
    } else {
      soundService.playSuccess();
      showNotice(`"${item.name}" colocado en el menú (DISPONIBLE para comandas).`);
    }
  };

  // Delete dish
  const handleConfirmDelete = (itemId: string) => {
    const item = menuItems.find((m) => m.id === itemId);
    onDeleteMenuItem(itemId);
    setDeleteConfirmId(null);
    soundService.playCashChime();
    showNotice(`Plato "${item?.name || 'seleccionado'}" eliminado de la carta.`);
  };

  // Filter items
  const filteredItems = menuItems.filter((item) => {
    // Channel / Menu Scope match
    if (menuChannelFilter === 'waiters' && item.menuTarget === 'excursions') return false;
    if (menuChannelFilter === 'excursions' && item.menuTarget === 'waiters') return false;

    // Category match
    if (selectedCategory === 'out_of_stock' && item.isAvailable) return false;
    if (selectedCategory !== 'all' && selectedCategory !== 'out_of_stock' && item.category !== selectedCategory) {
      return false;
    }
    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchTag = item.tag?.toLowerCase().includes(q) || false;
      if (!matchName && !matchDesc && !matchTag) return false;
    }
    return true;
  });

  const totalDishes = menuItems.length;
  const waiterMenuCount = menuItems.filter((m) => m.menuTarget !== 'excursions').length;
  const excursionMenuCount = menuItems.filter((m) => m.menuTarget !== 'waiters').length;
  const availableCount = menuItems.filter((m) => m.isAvailable).length;
  const outOfStockCount = totalDishes - availableCount;

  return (
    <div className="space-y-4">
      {/* Hidden File Inputs for Phone Camera and Phone Gallery */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        id="phone-camera-input"
      />
      <input
        type="file"
        ref={galleryInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        id="phone-gallery-input"
      />

      {/* Header Banner: Owner Menu Management */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#002546] text-[#57d1fd] flex items-center justify-center shadow-xs">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#002546]">Gestión de Carta y Platos</h2>
                <span className="text-[10px] font-bold bg-[#eff4ff] text-[#006782] px-2 py-0.5 rounded-full border border-[#d2e4ff]">
                  Panel del Dueño
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Quita, coloca o agrega platos al menú. Toma fotos directamente desde tu teléfono.
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="w-full sm:w-auto h-11 px-4 bg-[#002546] hover:bg-[#0d3b66] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all shrink-0 active:scale-95"
          >
            <Plus className="w-4 h-4 text-[#57d1fd]" />
            <span>+ Agregar Nuevo Plato</span>
          </button>
        </div>

        {/* Global Statistics Counter */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
          <div className="bg-[#f8f9ff] p-2.5 rounded-xl border border-gray-200 text-center">
            <span className="text-[10px] uppercase font-bold text-gray-500 block">Total Carta</span>
            <span className="text-lg font-extrabold text-[#002546]">{totalDishes}</span>
            <span className="text-[10px] text-gray-400 block">en el sistema</span>
          </div>
          <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200 text-center">
            <span className="text-[10px] uppercase font-bold text-emerald-700 block">Disponibles</span>
            <span className="text-lg font-extrabold text-emerald-700">{availableCount}</span>
            <span className="text-[10px] text-emerald-600 block">en venta activa</span>
          </div>
          <div className="bg-rose-50/60 p-2.5 rounded-xl border border-rose-200 text-center">
            <span className="text-[10px] uppercase font-bold text-rose-700 block">Agotados</span>
            <span className="text-lg font-extrabold text-rose-700">{outOfStockCount}</span>
            <span className="text-[10px] text-rose-600 block">quitados del día</span>
          </div>
        </div>
      </div>

      {/* Toast Notification Alert */}
      {noticeMessage && (
        <div className="bg-[#eff4ff] border border-[#a4c9fc] text-[#002546] p-3 rounded-2xl text-xs flex items-center gap-2.5 font-medium shadow-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#006782] shrink-0" />
          <span className="flex-1">{noticeMessage}</span>
          <button
            onClick={() => setNoticeMessage(null)}
            className="text-gray-400 hover:text-gray-600 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search & Category Filter Navigation */}
      <div className="bg-white rounded-2xl border border-gray-200 p-3 shadow-sm space-y-2.5">
        {/* Selector de Menú / Canal: Mesoneros vs Excursiones */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#f0f4f9] rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setMenuChannelFilter('all')}
            className={`py-2 px-2 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 ${
              menuChannelFilter === 'all'
                ? 'bg-[#002546] text-white shadow-xs'
                : 'text-gray-600 hover:text-[#002546]'
            }`}
          >
            <span>🌐 Toda la Carta</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {totalDishes}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMenuChannelFilter('waiters')}
            className={`py-2 px-2 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 ${
              menuChannelFilter === 'waiters'
                ? 'bg-[#006782] text-white shadow-xs'
                : 'text-gray-600 hover:text-[#006782]'
            }`}
          >
            <span>🍽️ Menú Mesoneros</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {waiterMenuCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMenuChannelFilter('excursions')}
            className={`py-2 px-2 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 ${
              menuChannelFilter === 'excursions'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-sky-700'
            }`}
          >
            <span>🚤 Menú Excursiones</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {excursionMenuCount}
            </span>
          </button>
        </div>

        {/* Notice of active channel filter */}
        {menuChannelFilter === 'waiters' && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-3 py-1.5 text-[11px] flex items-center justify-between">
            <span className="font-semibold">
              🍽️ Viendo platos habilitados para Mesoneros y Toldos (Precios de playa con propina y comisión)
            </span>
            <button
              type="button"
              onClick={() => setMenuChannelFilter('all')}
              className="text-amber-700 hover:underline text-[10px] font-bold"
            >
              Ver todos
            </button>
          </div>
        )}
        {menuChannelFilter === 'excursions' && (
          <div className="bg-sky-50 border border-sky-200 text-sky-900 rounded-xl px-3 py-1.5 text-[11px] flex items-center justify-between">
            <span className="font-semibold">
              🚤 Viendo platos y tarifas especiales para Excursiones Marítimas (Precios negociados de grupo, 0% propina)
            </span>
            <button
              type="button"
              onClick={() => setMenuChannelFilter('all')}
              className="text-sky-700 hover:underline text-[10px] font-bold"
            >
              Ver todos
            </button>
          </div>
        )}

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por nombre, descripción o ingrediente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-8 rounded-xl border border-gray-200 text-xs bg-[#f8f9ff] text-[#002546] placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-[#006782] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Categories Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { key: 'all', label: `Todos (${totalDishes})` },
            { key: 'pescados', label: 'Pescados' },
            { key: 'mariscos', label: 'Mariscos' },
            { key: 'entradas', label: 'Entradas' },
            { key: 'bebidas', label: 'Bebidas' },
            { key: 'postres', label: 'Postres' },
            { key: 'out_of_stock', label: `Agotados (${outOfStockCount})` },
          ].map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key as CategoryFilter)}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.key
                  ? 'bg-[#002546] text-white shadow-xs'
                  : 'bg-[#eff4ff] text-[#42474f] hover:bg-[#dce9ff] hover:text-[#002546]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dishes Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredItems.map((item) => {
          const isDeleting = deleteConfirmId === item.id;
          return (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
                item.isAvailable
                  ? 'border-gray-200 shadow-xs hover:shadow-sm'
                  : 'border-rose-200 bg-rose-50/10 shadow-xs opacity-90'
              }`}
            >
              <div>
                {/* Photo & Status Banner */}
                <div className="relative h-40 bg-gray-100 overflow-hidden group">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                      !item.isAvailable ? 'grayscale-[60%]' : ''
                    }`}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                  {/* Availability Badge */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xs backdrop-blur-xs flex items-center gap-1 ${
                        item.isAvailable
                          ? 'bg-emerald-500/90 text-white'
                          : 'bg-rose-500/90 text-white'
                      }`}
                    >
                      {item.isAvailable ? (
                        <>
                          <Check className="w-3 h-3 stroke-[3]" /> En Menú
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3" /> Agotado
                        </>
                      )}
                    </span>
                    {item.tag && (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-black/60 text-[#57d1fd] backdrop-blur-xs border border-white/20">
                        {item.tag}
                      </span>
                    )}
                  </div>

                  {/* Category Pill */}
                  <div className="absolute top-2.5 right-2.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/90 text-[#002546] capitalize shadow-xs">
                      {item.category}
                    </span>
                  </div>

                  {/* Bottom Image Overlay: Prices for both channels */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between text-white">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Precio Mesonero */}
                        <div className="bg-black/75 backdrop-blur-xs px-2 py-0.5 rounded-lg border border-white/20">
                          <span className="text-[9px] uppercase font-bold text-amber-300 block">🍽️ Mesoneros</span>
                          <span className="text-sm font-extrabold">{formatUsd(item.priceUsd)}</span>
                        </div>
                        {/* Precio Excursión */}
                        <div className="bg-sky-950/80 backdrop-blur-xs px-2 py-0.5 rounded-lg border border-sky-400/40">
                          <span className="text-[9px] uppercase font-bold text-sky-300 block">🚤 Excursión</span>
                          <span className="text-sm font-extrabold text-sky-100">
                            {formatUsd(item.priceExcursionUsd ?? item.priceUsd)}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-white/90 font-mono block drop-shadow-sm mt-0.5">
                        Tasa BCV: {bcvRate.toFixed(2)} Bs/$
                      </span>
                    </div>

                    {item.estimatedMinutes && (
                      <span className="text-[10px] bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded text-white/90 flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3 text-[#57d1fd]" />
                        {item.estimatedMinutes}
                      </span>
                    )}
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-[#002546] leading-snug">
                      {item.name}
                    </h3>
                  </div>

                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  {item.servingSize && (
                    <div className="text-[11px] text-gray-400 font-medium">
                      Porción: <span className="text-[#002546]">{item.servingSize}</span>
                    </div>
                  )}

                  {/* Pricing Breakdown Grid */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {/* Tarifa Mesoneros */}
                    <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-2 text-[11px]">
                      <div className="flex items-center justify-between text-[10px] font-bold text-amber-900 mb-0.5">
                        <span>🍽️ Mesoneros</span>
                        <span className="font-mono text-xs">{formatUsd(item.priceUsd)}</span>
                      </div>
                      <div className="text-[10px] text-amber-800 font-medium">
                        {item.waiterShareUsd && item.waiterShareUsd > 0 ? (
                          <span className="text-amber-900 font-bold">
                            🤝 Mesonero: +${item.waiterShareUsd.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-500">Sin parte mesonero</span>
                        )}
                      </div>
                    </div>

                    {/* Tarifa Excursiones */}
                    <div className="bg-sky-50/80 border border-sky-200 rounded-xl p-2 text-[11px]">
                      <div className="flex items-center justify-between text-[10px] font-bold text-sky-900 mb-0.5">
                        <span>🚤 Excursión</span>
                        <span className="font-mono text-xs text-sky-950 font-extrabold">
                          {formatUsd(item.priceExcursionUsd ?? item.priceUsd)}
                        </span>
                      </div>
                      <div className="text-[10px] text-sky-700 font-medium">
                        Tarifa Grupo (0% prop.)
                      </div>
                    </div>
                  </div>

                  {/* Scope Badge */}
                  <div className="flex items-center justify-between text-[10px] font-bold pt-0.5">
                    <span className="text-gray-400">Canal:</span>
                    {item.menuTarget === 'waiters' && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                        Solo Mesoneros & Toldos
                      </span>
                    )}
                    {item.menuTarget === 'excursions' && (
                      <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-900 border border-sky-200">
                        Solo Excursiones & Lanchas
                      </span>
                    )}
                    {(!item.menuTarget || item.menuTarget === 'all') && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        ✓ Ambos Menús
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="p-3 pt-0 space-y-2">
                {isDeleting ? (
                  /* Confirmation State for Deletion */
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 space-y-2 text-center animate-fade-in">
                    <p className="text-xs font-bold text-rose-900">
                      ¿Seguro que deseas eliminar este plato de la carta?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleConfirmDelete(item.id)}
                        className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                      >
                        Sí, Eliminar
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="flex-1 py-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg text-xs font-bold transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Primary Toggle Button: Quitar / Colocar */}
                    <button
                      onClick={() => handleToggle(item)}
                      className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs ${
                        item.isAvailable
                          ? 'bg-[#eff4ff] hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700'
                      }`}
                    >
                      {item.isAvailable ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Quitar de Venta (Marcar Agotado)</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Colocar en Menú (Disponible)</span>
                        </>
                      )}
                    </button>

                    {/* Secondary Actions: Edit and Delete */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="flex-1 py-1.5 px-2 bg-gray-50 hover:bg-[#eff4ff] border border-gray-200 hover:border-[#a4c9fc] text-[#002546] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#006782]" />
                        <span>Editar / Cambiar Foto</span>
                      </button>

                      <button
                        onClick={() => setDeleteConfirmId(item.id)}
                        title="Eliminar plato"
                        className="w-9 h-8 bg-gray-50 hover:bg-rose-50 border border-gray-200 hover:border-rose-200 text-gray-500 hover:text-rose-600 rounded-xl flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#eff4ff] text-[#006782] flex items-center justify-center mx-auto">
            <Utensils className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[#002546]">No se encontraron platos</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            No hay platos con los filtros seleccionados. Puedes cambiar la categoría o agregar un nuevo plato.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-[#002546] text-white rounded-xl text-xs font-bold inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-[#57d1fd]" />
            <span>Agregar Primer Plato</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AGREGAR O EDITAR PLATO CON FOTO DIRECTA DESDE EL TELÉFONO          */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-200 my-auto animate-fade-in flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-[#002546] text-white p-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#0d3b66] text-[#57d1fd] flex items-center justify-center">
                  <Utensils className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {editingItem ? 'Editar Plato de la Carta' : 'Agregar Nuevo Plato al Menú'}
                  </h3>
                  <p className="text-[11px] text-white/70">
                    Sincronización instantánea con comandera y clientes
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmitForm} className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* PHOTO UPLOADER FROM PHONE */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#002546] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#006782]" />
                    Foto del Plato (Directa desde el Teléfono)
                  </span>
                  <span className="text-[10px] text-gray-500 font-normal">Cámara o Galería</span>
                </label>

                {/* Photo Preview & Controls Card */}
                <div className="bg-[#f8f9ff] border-2 border-dashed border-[#a4c9fc] rounded-2xl p-3 text-center relative overflow-hidden">
                  {formImageUrl ? (
                    <div className="space-y-2">
                      <div className="relative h-44 rounded-xl overflow-hidden shadow-inner bg-black/5">
                        <img
                          src={formImageUrl}
                          alt="Vista previa"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded">
                          Foto cargada
                        </div>
                      </div>

                      {/* Action buttons to change photo */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="py-2 px-2.5 bg-[#002546] hover:bg-[#0d3b66] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                        >
                          <Camera className="w-3.5 h-3.5 text-[#57d1fd]" />
                          <span>Tomar con Teléfono</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => galleryInputRef.current?.click()}
                          className="py-2 px-2.5 bg-white hover:bg-gray-100 border border-gray-300 text-[#002546] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                        >
                          <Upload className="w-3.5 h-3.5 text-[#006782]" />
                          <span>Elegir de Galería</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 space-y-3">
                      <div className="w-12 h-12 rounded-full bg-[#eff4ff] text-[#006782] flex items-center justify-center mx-auto">
                        <Camera className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#002546]">
                          Sube una foto del plato desde tu teléfono
                        </p>
                        <p className="text-[11px] text-gray-500">
                          Usa la cámara del teléfono o selecciona de tu carrete
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-center gap-2 max-w-xs mx-auto pt-2">
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="py-2.5 px-3 bg-[#002546] hover:bg-[#0d3b66] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                        >
                          <Camera className="w-4 h-4 text-[#57d1fd]" />
                          <span>Abrir Cámara</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => galleryInputRef.current?.click()}
                          className="py-2.5 px-3 bg-white hover:bg-gray-100 border border-gray-300 text-[#002546] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                        >
                          <Upload className="w-4 h-4 text-[#006782]" />
                          <span>Seleccionar Archivo</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {isProcessingImage && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center gap-2 text-xs font-bold text-[#002546]">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#006782]" />
                      <span>Procesando foto del teléfono...</span>
                    </div>
                  )}
                </div>

                {/* Preset Picker Toggle */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPresetPicker(!showPresetPicker)}
                    className="text-[#006782] hover:text-[#002546] font-bold inline-flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#57d1fd]" />
                    <span>{showPresetPicker ? 'Ocultar catálogo de fotos sugeridas' : 'Ver fotos sugeridas de Playa Buche'}</span>
                  </button>
                </div>

                {/* Preset Photos Gallery Grid */}
                {showPresetPicker && (
                  <div className="bg-white border border-gray-200 rounded-2xl p-2.5 space-y-2 animate-fade-in">
                    <p className="text-[11px] text-gray-500 font-medium">
                      O selecciona una de nuestras fotos de alta definición para platos típicos:
                    </p>
                    <div className="grid grid-cols-5 gap-1.5 max-h-36 overflow-y-auto p-1">
                      {PRESET_PHOTOS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFormImageUrl(preset.url)}
                          className={`group relative aspect-square rounded-lg overflow-hidden border transition-all ${
                            formImageUrl === preset.url
                              ? 'border-[#002546] ring-2 ring-[#002546]'
                              : 'border-gray-200 hover:border-[#006782]'
                          }`}
                        >
                          <img
                            src={preset.url}
                            alt={preset.label}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />
                          <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[7px] p-0.5 truncate text-center">
                            {preset.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-[#002546] block mb-1">
                    Nombre del Plato *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Pargo Rojo a la Leña"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-gray-300 text-xs font-bold text-[#002546] focus:ring-2 focus:ring-[#006782]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#002546] block mb-1">
                    Categoría *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as MenuItem['category'])}
                    className="w-full h-10 px-3 rounded-xl border border-gray-300 text-xs font-bold text-[#002546] bg-white focus:ring-2 focus:ring-[#006782]"
                  >
                    <option value="pescados">Pescados</option>
                    <option value="mariscos">Mariscos</option>
                    <option value="entradas">Entradas</option>
                    <option value="bebidas">Bebidas</option>
                    <option value="postres">Postres</option>
                  </select>
                </div>
              </div>

              {/* Destino / Canal del Menú */}
              <div className="bg-[#f0f4f9] border border-gray-200 rounded-2xl p-3 space-y-2">
                <label className="text-xs font-bold text-[#002546] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span>🧭</span>
                    <span>Canal de Venta / Destino del Plato *</span>
                  </span>
                  <span className="text-[10px] text-gray-500 font-normal">¿Dónde estará disponible?</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormMenuTarget('all')}
                    className={`p-2.5 rounded-xl border text-center transition-all text-xs font-bold ${
                      formMenuTarget === 'all'
                        ? 'bg-[#002546] text-white border-[#002546] shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="block text-base mb-0.5">🌟</span>
                    <span>Ambos Menús</span>
                    <span className="block text-[10px] font-normal opacity-80">Mesoneros y Excursión</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormMenuTarget('waiters')}
                    className={`p-2.5 rounded-xl border text-center transition-all text-xs font-bold ${
                      formMenuTarget === 'waiters'
                        ? 'bg-[#006782] text-white border-[#006782] shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="block text-base mb-0.5">🍽️</span>
                    <span>Solo Mesoneros</span>
                    <span className="block text-[10px] font-normal opacity-80">Toldos de Playa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormMenuTarget('excursions')}
                    className={`p-2.5 rounded-xl border text-center transition-all text-xs font-bold ${
                      formMenuTarget === 'excursions'
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="block text-base mb-0.5">🚤</span>
                    <span>Solo Excursiones</span>
                    <span className="block text-[10px] font-normal opacity-80">Lanchas & Paquetes</span>
                  </button>
                </div>
              </div>

              {/* SECCIÓN 1: Tarifa Mesoneros & Toldos de Playa */}
              {(formMenuTarget === 'all' || formMenuTarget === 'waiters') && (
                <div className="space-y-3 bg-[#eff4ff]/60 p-3.5 rounded-2xl border border-[#d2e4ff]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#002546] flex items-center gap-1.5">
                      <span>🍽️</span> Tarifa Mesoneros & Toldos de Playa (Venta al Público)
                    </span>
                    <span className="text-[10px] font-bold text-[#006782] bg-white px-2 py-0.5 rounded-full border border-[#a4c9fc]">
                      Precio Regular
                    </span>
                  </div>

                  {/* Price USD & Calculated BCV */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-[#002546] block mb-1">
                        Precio Mesoneros ($ USD) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.50"
                          min="0.50"
                          required={formMenuTarget !== 'excursions'}
                          placeholder="20.00"
                          value={formPriceUsd}
                          onChange={(e) => setFormPriceUsd(e.target.value)}
                          className="w-full h-10 pl-7 pr-3 rounded-xl border border-gray-300 text-xs font-bold text-[#002546] bg-white focus:ring-2 focus:ring-[#006782]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#002546] block mb-1">
                        Equivalente Oficial en Bs.
                      </label>
                      <div className="h-10 px-3 rounded-xl border border-gray-200 bg-white flex items-center text-xs font-mono font-bold text-[#006782]">
                        {formatBs(parseFloat(formPriceUsd) || 0)}
                      </div>
                      <span className="text-[10px] text-gray-500 block mt-0.5">
                        Tasa BCV: {bcvRate.toFixed(2)} Bs/$
                      </span>
                    </div>
                  </div>

                  {/* Parte a debitar para el Mesonero por plato vendido */}
                  <div className="bg-gradient-to-br from-amber-50/90 to-orange-50/60 border border-amber-200/90 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">🤝</span>
                        <label className="text-xs font-bold text-amber-950">
                          Parte a Debitar para el Mesonero ($ USD)
                        </label>
                      </div>
                      <span className="text-[10px] font-bold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full">
                        Débito Automático
                      </span>
                    </div>
                    <p className="text-[10px] text-amber-900/80 leading-relaxed">
                      Monto asignado al mesonero por cada plato vendido. Se debitará automáticamente a su favor al hacer el cierre de caja.
                    </p>

                    <div className="grid grid-cols-2 gap-3 items-center">
                      <div>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs font-bold text-amber-700">$</span>
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            placeholder="2.00"
                            value={formWaiterShareUsd}
                            onChange={(e) => setFormWaiterShareUsd(e.target.value)}
                            className="w-full pl-7 pr-3 h-9 rounded-xl border border-amber-300 bg-white text-xs font-bold text-amber-950 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="h-9 px-3 rounded-xl border border-amber-200 bg-white/90 flex items-center text-xs font-mono font-bold text-amber-900">
                          {formatBs(parseFloat(formWaiterShareUsd) || 0)}
                        </div>
                      </div>
                    </div>

                    {/* Atajos Rápidos */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[10px] font-bold text-amber-900/70 mr-1">Atajos:</span>
                      <button
                        type="button"
                        onClick={() => setFormWaiterShareUsd('0.00')}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-white border border-amber-200 text-amber-800 font-bold hover:bg-amber-100/60"
                      >
                        $0
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const p = parseFloat(formPriceUsd) || 0;
                          setFormWaiterShareUsd((p * 0.05).toFixed(2));
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-white border border-amber-200 text-amber-800 font-bold hover:bg-amber-100/60"
                      >
                        5% ({formatUsd((parseFloat(formPriceUsd) || 0) * 0.05)})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const p = parseFloat(formPriceUsd) || 0;
                          setFormWaiterShareUsd((p * 0.10).toFixed(2));
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-white border border-amber-200 text-amber-800 font-bold hover:bg-amber-100/60"
                      >
                        10% ({formatUsd((parseFloat(formPriceUsd) || 0) * 0.10)})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormWaiterShareUsd('1.00')}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-white border border-amber-200 text-amber-800 font-bold hover:bg-amber-100/60"
                      >
                        $1.00
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormWaiterShareUsd('2.00')}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-white border border-amber-200 text-amber-800 font-bold hover:bg-amber-100/60"
                      >
                        $2.00
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SECCIÓN 2: Tarifa Especial para Excursiones / Lanchas */}
              {(formMenuTarget === 'all' || formMenuTarget === 'excursions') && (
                <div className="space-y-3 bg-gradient-to-br from-sky-50 to-blue-50/60 p-3.5 rounded-2xl border border-sky-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                      <span>🚤</span> Tarifa Especial para Excursiones & Lancheros ($ USD)
                    </span>
                    <span className="text-[10px] font-bold text-sky-800 bg-sky-100/80 px-2 py-0.5 rounded-full border border-sky-300">
                      Tarifa Mayorista Grupo
                    </span>
                  </div>

                  <p className="text-[11px] text-sky-900/80 leading-relaxed">
                    Precio concertado para grupos que llegan en lanchas turísticas y agencias. Las excursiones no llevan cargo de 10% de propina.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-sky-950 block mb-1">
                        Precio Excursión ($ USD) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs font-bold text-sky-700">$</span>
                        <input
                          type="number"
                          step="0.50"
                          min="0.50"
                          required={formMenuTarget !== 'waiters'}
                          placeholder="18.00"
                          value={formPriceExcursionUsd}
                          onChange={(e) => setFormPriceExcursionUsd(e.target.value)}
                          className="w-full h-10 pl-7 pr-3 rounded-xl border border-sky-300 text-xs font-bold text-sky-950 bg-white focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-sky-950 block mb-1">
                        Equivalente en Bs. (BCV)
                      </label>
                      <div className="h-10 px-3 rounded-xl border border-sky-200 bg-white flex items-center text-xs font-mono font-bold text-sky-800">
                        {formatBs(parseFloat(formPriceExcursionUsd) || 0)}
                      </div>
                      <span className="text-[10px] text-sky-600 block mt-0.5">
                        Tasa BCV: {bcvRate.toFixed(2)} Bs/$
                      </span>
                    </div>
                  </div>

                  {/* Atajos Rápidos para calcular precio de excursión respecto a mesoneros */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] font-bold text-sky-900/70 mr-1">Calcular desde Mesonero:</span>
                    <button
                      type="button"
                      onClick={() => setFormPriceExcursionUsd(formPriceUsd)}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-white border border-sky-200 text-sky-800 font-bold hover:bg-sky-100"
                    >
                      Mismo Precio ({formatUsd(parseFloat(formPriceUsd) || 0)})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const p = parseFloat(formPriceUsd) || 0;
                        setFormPriceExcursionUsd((p * 0.90).toFixed(2));
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-white border border-sky-200 text-sky-800 font-bold hover:bg-sky-100"
                    >
                      -10% ({formatUsd((parseFloat(formPriceUsd) || 0) * 0.90)})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const p = parseFloat(formPriceUsd) || 0;
                        setFormPriceExcursionUsd((p * 0.85).toFixed(2));
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-white border border-sky-200 text-sky-800 font-bold hover:bg-sky-100"
                    >
                      -15% ({formatUsd((parseFloat(formPriceUsd) || 0) * 0.85)})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const p = parseFloat(formPriceUsd) || 0;
                        setFormPriceExcursionUsd((p * 0.80).toFixed(2));
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-white border border-sky-200 text-sky-800 font-bold hover:bg-sky-100"
                    >
                      -20% ({formatUsd((parseFloat(formPriceUsd) || 0) * 0.80)})
                    </button>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-[#002546] block mb-1">
                  Descripción / Ingredientes del Plato
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalla la preparación marina, tostones, salsas o guarniciones..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-300 text-xs text-[#002546] focus:ring-2 focus:ring-[#006782]"
                />
              </div>

              {/* Prep Time, Serving Size & Tag */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1 text-[11px]">Tiempo Prep.</label>
                  <input
                    type="text"
                    placeholder="15-20 min"
                    value={formEstimatedMinutes}
                    onChange={(e) => setFormEstimatedMinutes(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-gray-300 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1 text-[11px]">Ración / Peso</label>
                  <input
                    type="text"
                    placeholder="~600g / 2 pax"
                    value={formServingSize}
                    onChange={(e) => setFormServingSize(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-gray-300 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1 text-[11px]">Etiqueta / Tag</label>
                  <input
                    type="text"
                    placeholder="Pesca del Día"
                    value={formTag}
                    onChange={(e) => setFormTag(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-gray-300 text-xs"
                  />
                </div>
              </div>

              {/* Initial Availability Toggle */}
              <div className="bg-[#f8f9ff] border border-gray-200 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#002546] block">Estado de Disponibilidad</span>
                  <span className="text-[11px] text-gray-500">
                    {formIsAvailable ? 'Colocar activo de inmediato en el menú' : 'Guardar pero marcar como agotado'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormIsAvailable(!formIsAvailable)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    formIsAvailable
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}
                >
                  {formIsAvailable ? '✓ Disponible' : '✕ Agotado'}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-11 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 bg-[#002546] hover:bg-[#0d3b66] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#57d1fd]" />
                  <span>{editingItem ? 'Guardar Cambios' : 'Colocar Plato en Menú'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
