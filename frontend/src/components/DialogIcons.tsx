// Muslim-friendly SVG icons for dialog characters
export function ChildIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" fill="#FDE68A" />
      <circle cx="24" cy="20" r="10" fill="#FBBF24" />
      <circle cx="24" cy="22" r="9" fill="#FEF3C7" />
      {/* Face */}
      <circle cx="20" cy="20" r="1.5" fill="#1E293B" />
      <circle cx="28" cy="20" r="1.5" fill="#1E293B" />
      <path d="M21 25 C22 27, 26 27, 27 25" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Peci */}
      <ellipse cx="24" cy="14" rx="8" ry="3" fill="#FBBF24" />
      <path d="M16 14 C16 10, 32 10, 32 14" fill="#F59E0B" />
      {/* Body */}
      <path d="M14 38 C14 30, 34 30, 34 38" fill="#34D399" />
    </svg>
  );
}

export function MotherIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" fill="#A7F3D0" />
      {/* Hijab */}
      <path d="M10 22 C10 12, 38 12, 38 22 L38 30 C38 32, 36 34, 34 34 L14 34 C12 34, 10 32, 10 30 Z" fill="#10B981" />
      <path d="M12 22 C12 14, 36 14, 36 22 L36 24 C36 24, 30 26, 24 26 C18 26, 12 24, 12 24 Z" fill="#059669" />
      {/* Face oval */}
      <ellipse cx="24" cy="24" rx="8" ry="9" fill="#FEF3C7" />
      {/* Eyes */}
      <circle cx="20.5" cy="22" r="1.3" fill="#1E293B" />
      <circle cx="27.5" cy="22" r="1.3" fill="#1E293B" />
      {/* Smile */}
      <path d="M21 27 C22 29, 26 29, 27 27" stroke="#1E293B" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      {/* Body */}
      <path d="M14 40 C14 34, 34 34, 34 40" fill="#10B981" />
    </svg>
  );
}

export function FatherIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" fill="#DBEAFE" />
      {/* Face */}
      <circle cx="24" cy="23" r="9" fill="#FEF3C7" />
      {/* Peci / Kopiah */}
      <path d="M15 18 C15 11, 33 11, 33 18 L33 16 C33 16, 24 17, 15 16 Z" fill="#1E293B" />
      <rect x="15" y="15" width="18" height="3" rx="1" fill="#1E293B" />
      {/* Eyes */}
      <circle cx="20.5" cy="21" r="1.3" fill="#1E293B" />
      <circle cx="27.5" cy="21" r="1.3" fill="#1E293B" />
      {/* Beard */}
      <path d="M18 26 C18 30, 24 32, 30 26" fill="#8B7355" opacity="0.4" />
      {/* Smile */}
      <path d="M21 26 C22 28, 26 28, 27 26" stroke="#1E293B" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      {/* Body - Jubah */}
      <path d="M14 40 C14 33, 34 33, 34 40" fill="#3B82F6" />
    </svg>
  );
}

export const ROLE_CONFIG: Record<string, { label: string; Icon: React.FC<{ size?: number }>; bgClass: string; chatBg: string; align: string }> = {
  anak: { label: "Anak", Icon: ChildIcon, bgClass: "bg-amber-50", chatBg: "bg-slate-100 text-slate-700 rounded-bl-sm", align: "justify-start" },
  ibu: { label: "Ibu", Icon: MotherIcon, bgClass: "bg-emerald-50", chatBg: "bg-emerald-500 text-white rounded-br-sm", align: "justify-end" },
  ayah: { label: "Ayah", Icon: FatherIcon, bgClass: "bg-blue-50", chatBg: "bg-blue-500 text-white rounded-br-sm", align: "justify-end" },
  ortu: { label: "Orang Tua", Icon: MotherIcon, bgClass: "bg-emerald-50", chatBg: "bg-emerald-500 text-white rounded-br-sm", align: "justify-end" },
};
