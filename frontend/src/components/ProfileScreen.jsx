import React, { useState, useEffect } from 'react';
import { 
  User, 
  Sparkles, 
  ShoppingBag, 
  Coins, 
  Award, 
  Heart, 
  Edit2, 
  Check, 
  Clock, 
  Flame, 
  ShieldCheck, 
  RefreshCw,
  TrendingUp,
  BrainCircuit,
  MessageSquare,
  Gift
} from 'lucide-react';
import MirrorPetCanvas from './MirrorPetCanvas';
import WardrobeShopModal from './WardrobeShopModal';
import { 
  fetchPetAndProfile, 
  fetchShopCatalogue, 
  purchaseCosmetic, 
  equipCosmetic, 
  customizePet, 
  interactWithPet 
} from '../api/client';

export default function ProfileScreen({ language = 'en' }) {
  const [data, setData] = useState(null);
  const [catalogue, setCatalogue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Shop modal state
  const [isShopOpen, setIsShopOpen] = useState(false);

  // Editing pet name
  const [isEditingName, setIsEditingName] = useState(false);
  const [petNameInput, setPetNameInput] = useState('');

  // Live 3D Preview states
  const [previewOutfit, setPreviewOutfit] = useState(null);
  const [previewAccessory, setPreviewAccessory] = useState(null);
  const [previewEffect, setPreviewEffect] = useState(null);
  const [previewTheme, setPreviewTheme] = useState(null);

  // Interaction feedback toast
  const [interactionToast, setInteractionToast] = useState(null);

  const loadProfileData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileData, shopData] = await Promise.all([
        fetchPetAndProfile('demo_student'),
        fetchShopCatalogue('demo_student')
      ]);
      setData(profileData);
      setCatalogue(shopData);
      setPetNameInput(profileData.pet.pet_name);
      setPreviewOutfit(profileData.pet.equipped_outfit);
      setPreviewAccessory(profileData.pet.equipped_accessory);
      setPreviewEffect(profileData.pet.equipped_effect);
      setPreviewTheme(profileData.pet.color_theme);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError('Failed to load profile and pet data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, []);

  const handleSavePetName = async () => {
    if (!petNameInput.trim()) return;
    try {
      await customizePet(petNameInput.trim(), null, 'demo_student');
      setData((prev) => ({
        ...prev,
        pet: { ...prev.pet, pet_name: petNameInput.trim() }
      }));
      setIsEditingName(false);
    } catch (err) {
      console.error('Failed to save name:', err);
    }
  };

  const handleSelectColorTheme = async (themeId) => {
    try {
      await customizePet(null, themeId, 'demo_student');
      setPreviewTheme(themeId);
      setData((prev) => ({
        ...prev,
        pet: { ...prev.pet, color_theme: themeId }
      }));
    } catch (err) {
      console.error('Failed to change theme:', err);
    }
  };

  const handleInteract = async () => {
    try {
      const res = await interactWithPet('demo_student');
      setInteractionToast(res.message);
      setData((prev) => ({
        ...prev,
        pet: { ...prev.pet, happiness: res.happiness }
      }));
      setTimeout(() => setInteractionToast(null), 3000);
    } catch (err) {
      console.error('Interaction error:', err);
    }
  };

  const handlePurchase = async (cosmeticId) => {
    const res = await purchaseCosmetic(cosmeticId, 'demo_student');
    // Refresh profile and catalogue
    await loadProfileData();
    return res;
  };

  const handleEquip = async (category, cosmeticId) => {
    await equipCosmetic(category, cosmeticId, 'equip', 'demo_student');
    await loadProfileData();
  };

  const handleUnequip = async (category) => {
    await equipCosmetic(category, null, 'unequip', 'demo_student');
    await loadProfileData();
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0F1226]">
        <RefreshCw className="animate-spin text-[#6C4CF1] mb-3" size={36} />
        <p className="text-light-subtle text-sm font-medium">Loading profile and 3D companion...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0F1226]">
        <p className="text-white font-semibold mb-3">{error || 'Could not load data'}</p>
        <button
          onClick={loadProfileData}
          className="px-4 py-2 bg-[#1E2347] hover:bg-[#292E56] text-white rounded-xl text-sm font-semibold transition-all border border-[#292E56]"
        >
          Retry
        </button>
      </div>
    );
  }

  const { student_id, display_name, avatar_url, points_balance, total_earned_points, level, pet, recent_transactions } = data;

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 bg-[#0F1226]">
      {/* Top Banner & Student Identity (Kept Separate from Pet!) */}
      <div className="bg-[#171B36] border border-[#292E56] rounded-3xl p-6 lg:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {/* Normal Student Profile Avatar (Distinct from Pet!) */}
          <div className="relative">
            <img
              src={avatar_url}
              alt={display_name}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-[#6C4CF1] shadow-lg shadow-[#6C4CF1]/20"
            />
            <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md bg-[#6C4CF1] text-[10px] font-black text-white uppercase tracking-wider shadow">
              Lvl {level}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-black text-white tracking-tight">{display_name}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#0F1226] border border-[#292E56] text-light-subtle font-mono">
                @{student_id}
              </span>
            </div>
            <p className="text-xs text-light-subtle">
              Diagnostic Learner • Algorithmic Problem Solver
            </p>

            <div className="flex items-center gap-4 mt-3 text-xs text-[#A5A6C2]">
              <div className="flex items-center gap-1.5">
                <Flame size={15} className="text-[#F5A524]" />
                <span className="font-bold text-white">4-day</span> Study Streak
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-mastered-green" />
                <span className="font-bold text-white">100%</span> Honor Level
              </div>
            </div>
          </div>
        </div>

        {/* Learning Points Economy Badge */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="p-4 rounded-2xl bg-[#0F1226] border border-[#292E56] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F5A524]/20 border border-[#F5A524]/30 flex items-center justify-center text-[#F5A524]">
              <Coins size={22} />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-light-subtle uppercase tracking-wider">
                Progress Points
              </div>
              <div className="text-2xl font-black text-white font-mono">{points_balance} pts</div>
            </div>
          </div>

          <button
            onClick={() => setIsShopOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-gradient-to-r from-[#6C4CF1] to-[#22C3E6] hover:opacity-95 text-white text-xs font-black shadow-lg shadow-[#6C4CF1]/30 transition-all"
          >
            <ShoppingBag size={18} />
            <span>Style Shop & Wardrobe</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Dedicated 3D MirrorPet Arena & Learning Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (7 Spans): Dedicated 3D MirrorPet Arena */}
        <div className="lg:col-span-7 bg-[#171B36] border border-[#292E56] rounded-3xl p-6 lg:p-7 shadow-xl space-y-5 flex flex-col justify-between">
          <div>
            {/* Pet Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#292E56]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#22C3E6]/20 border border-[#22C3E6]/40 flex items-center justify-center text-[#22C3E6]">
                  <Sparkles size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    {isEditingName ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={petNameInput}
                          onChange={(e) => setPetNameInput(e.target.value)}
                          className="bg-[#0F1226] border border-[#6C4CF1] text-sm font-bold text-white rounded-lg px-2 py-0.5 focus:outline-none"
                          maxLength={20}
                        />
                        <button
                          onClick={handleSavePetName}
                          className="p-1 rounded bg-[#6C4CF1] text-white"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-lg font-black text-white">{pet.pet_name}</h3>
                        <button
                          onClick={() => setIsEditingName(true)}
                          className="text-light-subtle hover:text-white transition-colors"
                          title="Rename Pet"
                        >
                          <Edit2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-light-subtle">
                    Dedicated 3D Companion • Customisable Virtual Pet
                  </p>
                </div>
              </div>

              {/* Happiness Pill */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0F1226] border border-[#292E56] text-xs font-semibold">
                <Heart size={14} className="text-rose-400 fill-rose-400 animate-pulse" />
                <span className="text-white font-bold">{pet.happiness}% Happy</span>
              </div>
            </div>

            {/* Interaction Toast */}
            {interactionToast && (
              <div className="mt-3 p-3 rounded-xl bg-[#22C3E6]/20 border border-[#22C3E6]/40 text-xs text-[#22C3E6] font-bold animate-fadeIn">
                ✨ {interactionToast}
              </div>
            )}

            {/* 3D Canvas Scene */}
            <div className="relative mt-4 bg-gradient-to-b from-[#12162E] to-[#0A0D1F] rounded-2xl border border-[#292E56] overflow-hidden">
              <MirrorPetCanvas
                colorTheme={previewTheme || pet.color_theme}
                equippedOutfit={previewOutfit}
                equippedAccessory={previewAccessory}
                equippedEffect={previewEffect}
                onInteract={handleInteract}
                interactive={true}
                height="340px"
              />
            </div>
          </div>

          {/* Pet Controls & Equipped Badges */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-light-subtle font-semibold">Currently Equipped:</span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-[#0F1226] border border-[#292E56] text-white text-[11px] font-medium">
                  👔 {pet.equipped_details?.equipped_outfit?.name || 'Standard Outfit'}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-[#0F1226] border border-[#292E56] text-white text-[11px] font-medium">
                  🎩 {pet.equipped_details?.equipped_accessory?.name || 'No Accessory'}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-[#0F1226] border border-[#292E56] text-white text-[11px] font-medium">
                  ✨ {pet.equipped_details?.equipped_effect?.name || 'No Aura'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleInteract}
                className="flex-1 py-2.5 rounded-xl bg-[#1E2347] hover:bg-[#292E56] text-white text-xs font-bold transition-all border border-[#292E56] flex items-center justify-center gap-2 shadow-sm"
              >
                <Heart size={14} className="text-rose-400" />
                <span>Pet & Play (Wave / Jump)</span>
              </button>

              <button
                onClick={() => setIsShopOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-[#6C4CF1] hover:bg-[#5939D8] text-white text-xs font-bold transition-all shadow-md shadow-[#6C4CF1]/30 flex items-center gap-2"
              >
                <ShoppingBag size={14} />
                <span>Change Style</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (5 Spans): Points Ledger & Learning Activity Milestones */}
        <div className="lg:col-span-5 space-y-6">
          {/* Milestone Achievements */}
          <div className="bg-[#171B36] border border-[#292E56] rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Award size={18} className="text-[#F5A524]" />
              <span>Learning Milestones</span>
            </h3>
            <p className="text-xs text-light-subtle">
              Complete diagnostic feats to unlock exclusive cosmetics for your pet.
            </p>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-[#0F1226] border border-mastered-green/30 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-mastered-green/20 text-mastered-green flex items-center justify-center shrink-0">
                  <BrainCircuit size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Root-Cause Solver</span>
                    <span className="text-[10px] font-bold text-mastered-green">UNLOCKED</span>
                  </div>
                  <div className="text-[11px] text-light-subtle mt-0.5">
                    Resolve a root-cause misconception via counter-example.
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0F1226] border border-[#292E56] flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#6C4CF1]/20 text-[#6C4CF1] flex items-center justify-center shrink-0">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Feynman Mentor</span>
                    <span className="text-[10px] font-bold text-[#F5A524]">88/100 Pts</span>
                  </div>
                  <div className="text-[11px] text-light-subtle mt-0.5">
                    Attain score &ge; 80 in TeachBack Socratic AI session. Unlocks Golden Halo.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Points Transaction Ledger */}
          <div className="bg-[#171B36] border border-[#292E56] rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Clock size={18} className="text-[#22C3E6]" />
                <span>Points Transaction Ledger</span>
              </h3>
              <span className="text-[11px] text-light-subtle font-mono">
                Lifetime: {total_earned_points} pts
              </span>
            </div>

            <div className="space-y-2.5">
              {recent_transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 rounded-xl bg-[#0F1226]/60 border border-[#292E56] flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-white">{tx.reason}</div>
                    <div className="text-[10px] text-light-subtle font-mono">{tx.created_at}</div>
                  </div>
                  <span
                    className={`font-mono font-black ${
                      tx.amount > 0 ? 'text-mastered-green' : 'text-rootcause-red'
                    }`}
                  >
                    {tx.amount > 0 ? `+${tx.amount}` : tx.amount} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Wardrobe & Style Shop Modal */}
      <WardrobeShopModal
        isOpen={isShopOpen}
        onClose={() => setIsShopOpen(false)}
        catalogue={catalogue}
        petData={pet}
        pointsBalance={points_balance}
        onPurchase={handlePurchase}
        onEquip={handleEquip}
        onUnequip={handleUnequip}
        onSelectColorTheme={handleSelectColorTheme}
        previewOutfit={previewOutfit}
        setPreviewOutfit={setPreviewOutfit}
        previewAccessory={previewAccessory}
        setPreviewAccessory={setPreviewAccessory}
        previewEffect={previewEffect}
        setPreviewEffect={setPreviewEffect}
        previewTheme={previewTheme}
        setPreviewTheme={setPreviewTheme}
      />
    </div>
  );
}
