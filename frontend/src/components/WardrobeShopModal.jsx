import React, { useState } from 'react';
import { 
  X, 
  ShoppingBag, 
  Check, 
  Lock, 
  Sparkles, 
  Award, 
  Zap, 
  Shield, 
  Glasses, 
  Headphones, 
  Feather, 
  Sun, 
  Activity, 
  BookOpen, 
  Coins,
  RefreshCw,
  Palette
} from 'lucide-react';

const ICON_MAP = {
  BookOpen: BookOpen,
  Zap: Zap,
  Shield: Shield,
  Award: Award,
  Sparkles: Sparkles,
  Glasses: Glasses,
  Headphones: Headphones,
  Feather: Feather,
  Sun: Sun,
  Activity: Activity,
};

const COLOR_THEMES = [
  { id: 'violet', name: 'Violet Spark', color: '#6C4CF1', bg: 'bg-[#6C4CF1]' },
  { id: 'emerald', name: 'Emerald Drake', color: '#1FB57A', bg: 'bg-[#1FB57A]' },
  { id: 'cyan', name: 'Cyber Cyan', color: '#22C3E6', bg: 'bg-[#22C3E6]' },
  { id: 'gold', name: 'Golden Sunset', color: '#F5A524', bg: 'bg-[#F5A524]' },
  { id: 'pink', name: 'Cosmic Pink', color: '#E040FB', bg: 'bg-[#E040FB]' },
];

export default function WardrobeShopModal({
  isOpen,
  onClose,
  catalogue = [],
  petData = null,
  pointsBalance = 0,
  onPurchase,
  onEquip,
  onUnequip,
  onSelectColorTheme,
  previewOutfit,
  setPreviewOutfit,
  previewAccessory,
  setPreviewAccessory,
  previewEffect,
  setPreviewEffect,
  previewTheme,
  setPreviewTheme
}) {
  const [activeTab, setActiveTab] = useState('all');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseNotice, setPurchaseNotice] = useState(null);
  const [purchaseError, setPurchaseError] = useState(null);

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All Items' },
    { id: 'outfit', label: 'Outfits' },
    { id: 'accessory', label: 'Accessories' },
    { id: 'effect', label: 'Visual Effects' },
    { id: 'colors', label: 'Pet Colors' },
  ];

  const filteredItems = catalogue.filter((item) => {
    if (activeTab === 'all') return true;
    return item.category === activeTab;
  });

  const handleBuy = async (item) => {
    setPurchaseError(null);
    setPurchaseNotice(null);
    if (pointsBalance < item.price) {
      setPurchaseError(`Insufficient points! You need ${item.price} pts, but have ${pointsBalance} pts.`);
      return;
    }
    setIsPurchasing(true);
    try {
      await onPurchase(item.id);
      setPurchaseNotice(`Unlocked ${item.name}! You can now equip it.`);
      setTimeout(() => setPurchaseNotice(null), 3000);
    } catch (err) {
      setPurchaseError(err.message || 'Purchase failed.');
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#171B36] border border-[#292E56] rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#292E56] flex items-center justify-between bg-[#12162E]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#6C4CF1] to-[#22C3E6] flex items-center justify-center text-white shadow-md">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">MirrorPet Style Shop & Wardrobe</h3>
              <p className="text-xs text-light-subtle">
                Personalise your 3D pet with outfits, accessories, and glowing visual effects
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Balance Badge */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0F1226] border border-[#292E56]">
              <Coins size={16} className="text-[#F5A524]" />
              <span className="text-xs font-bold text-white font-mono">{pointsBalance} pts</span>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-light-subtle hover:text-white hover:bg-[#1E2347] transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Notices */}
        {purchaseNotice && (
          <div className="bg-mastered-green/20 border-b border-mastered-green/40 px-6 py-2.5 text-xs text-mastered-green font-bold flex items-center justify-between">
            <span>✨ {purchaseNotice}</span>
            <button onClick={() => setPurchaseNotice(null)}>✕</button>
          </div>
        )}
        {purchaseError && (
          <div className="bg-rootcause-red/20 border-b border-rootcause-red/40 px-6 py-2.5 text-xs text-rootcause-red font-bold flex items-center justify-between">
            <span>⚠️ {purchaseError}</span>
            <button onClick={() => setPurchaseError(null)}>✕</button>
          </div>
        )}

        {/* Category Tabs */}
        <div className="px-6 py-3 border-b border-[#292E56] flex items-center gap-2 overflow-x-auto bg-[#151936]">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === cat.id
                  ? 'bg-[#6C4CF1] text-white shadow-md shadow-[#6C4CF1]/30'
                  : 'text-[#A5A6C2] hover:text-white hover:bg-[#1E2347]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Catalog Grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'colors' ? (
            /* Color Theme Picker */
            <div>
              <h4 className="text-xs font-bold text-light-subtle uppercase tracking-wider mb-4 flex items-center gap-2">
                <Palette size={16} className="text-[#22C3E6]" />
                <span>Base Creature Color Themes</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {COLOR_THEMES.map((theme) => {
                  const isCurrent = (previewTheme || petData?.color_theme) === theme.id;
                  return (
                    <div
                      key={theme.id}
                      onClick={() => {
                        setPreviewTheme(theme.id);
                        if (onSelectColorTheme) onSelectColorTheme(theme.id);
                      }}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                        isCurrent
                          ? 'bg-[#1E2347] border-[#22C3E6] shadow-lg shadow-[#22C3E6]/20'
                          : 'bg-[#0F1226]/60 border-[#292E56] hover:border-[#6C4CF1]/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full ${theme.bg} shadow-md`} />
                        <div>
                          <div className="text-sm font-bold text-white">{theme.name}</div>
                          <div className="text-[11px] text-light-subtle capitalize">{theme.id} skin shader</div>
                        </div>
                      </div>

                      {isCurrent ? (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-mastered-green/20 text-mastered-green border border-mastered-green/30">
                          Active
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-light-subtle">Select</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Cosmetics Catalogue Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const IconComponent = ICON_MAP[item.icon] || Sparkles;
                const isEquipped = item.is_equipped;
                const isOwned = item.is_owned;
                const isLocked = item.is_locked;

                // Check preview state
                let isPreviewing = false;
                if (item.category === 'outfit' && previewOutfit === item.id) isPreviewing = true;
                if (item.category === 'accessory' && previewAccessory === item.id) isPreviewing = true;
                if (item.category === 'effect' && previewEffect === item.id) isPreviewing = true;

                return (
                  <div
                    key={item.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                      isEquipped
                        ? 'bg-[#1E2347] border-mastered-green shadow-lg shadow-mastered-green/10'
                        : isPreviewing
                        ? 'bg-[#1E2347] border-[#22C3E6] ring-2 ring-[#22C3E6]/40'
                        : isLocked
                        ? 'bg-[#0F1226]/40 border-[#292E56] opacity-75'
                        : 'bg-[#0F1226]/70 border-[#292E56] hover:border-[#6C4CF1]/40'
                    }`}
                  >
                    <div>
                      {/* Top Bar: Icon & Category */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-[#171B36] border border-[#292E56] flex items-center justify-center text-[#22C3E6]">
                          <IconComponent size={20} />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#171B36] text-light-subtle border border-[#292E56]">
                            {item.category}
                          </span>
                          {isEquipped && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-mastered-green/20 text-mastered-green border border-mastered-green/30">
                              Equipped
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Name & Description */}
                      <h4 className="text-sm font-bold text-white mb-1">{item.name}</h4>
                      <p className="text-xs text-light-subtle leading-relaxed mb-3">
                        {item.description}
                      </p>

                      {/* Milestone Lock Notice */}
                      {isLocked && item.milestone_requirement && (
                        <div className="mb-3 p-2 rounded-lg bg-rootcause-red/15 border border-rootcause-red/30 flex items-center gap-2 text-[11px] text-rootcause-red font-medium">
                          <Lock size={13} className="shrink-0" />
                          <span>Locked: Complete milestone '{item.milestone_requirement.replace(/_/g, ' ')}'</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Area */}
                    <div className="pt-3 border-t border-[#292E56] flex items-center justify-between gap-2 mt-2">
                      {isOwned ? (
                        <>
                          <button
                            onClick={() => {
                              if (item.category === 'outfit') setPreviewOutfit(item.id);
                              if (item.category === 'accessory') setPreviewAccessory(item.id);
                              if (item.category === 'effect') setPreviewEffect(item.id);
                            }}
                            className="text-[11px] font-semibold text-[#22C3E6] hover:text-white transition-colors"
                          >
                            {isPreviewing ? 'Previewing' : 'Preview 3D'}
                          </button>

                          {isEquipped ? (
                            <button
                              onClick={() => onUnequip(item.category)}
                              className="px-3 py-1.5 rounded-xl bg-[#171B36] hover:bg-[#292E56] text-xs font-bold text-[#A5A6C2] hover:text-white border border-[#292E56] transition-all"
                            >
                              Unequip
                            </button>
                          ) : (
                            <button
                              onClick={() => onEquip(item.category, item.id)}
                              className="px-4 py-1.5 rounded-xl bg-[#6C4CF1] hover:bg-[#5939D8] text-xs font-bold text-white shadow-md shadow-[#6C4CF1]/20 transition-all"
                            >
                              Equip
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              if (item.category === 'outfit') setPreviewOutfit(item.id);
                              if (item.category === 'accessory') setPreviewAccessory(item.id);
                              if (item.category === 'effect') setPreviewEffect(item.id);
                            }}
                            className="text-[11px] font-semibold text-light-subtle hover:text-[#22C3E6] transition-colors"
                          >
                            Try On
                          </button>

                          <button
                            onClick={() => handleBuy(item)}
                            disabled={isLocked || isPurchasing || pointsBalance < item.price}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              isLocked
                                ? 'bg-[#171B36] text-light-subtle/50 border border-[#292E56] cursor-not-allowed'
                                : pointsBalance < item.price
                                ? 'bg-[#171B36] text-[#F5A524]/60 border border-[#292E56] hover:border-[#F5A524]/40'
                                : 'bg-[#22C3E6]/20 hover:bg-[#22C3E6]/30 text-[#22C3E6] border border-[#22C3E6]/40 shadow-sm'
                            }`}
                          >
                            {isLocked ? (
                              <>
                                <Lock size={12} />
                                <span>Locked</span>
                              </>
                            ) : (
                              <>
                                <Coins size={13} className="text-[#F5A524]" />
                                <span>{item.price} pts</span>
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#292E56] bg-[#12162E] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-light-subtle">
            ✨ Earn points by completing practice, resolving misconceptions, and teaching back concepts.
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#6C4CF1] hover:bg-[#5939D8] text-white font-bold transition-all shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
