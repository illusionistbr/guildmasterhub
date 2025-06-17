// This file is used to list Lucide icons that might not be directly
// auto-imported or for which we want to ensure availability.
// It can also be used for custom SVG icons if needed in the future.

// Example of re-exporting specific icons if tree-shaking becomes an issue
// or for easier access:
// export { Info as InfoCircle } from 'lucide-react';

// For now, we'll just list some potentially used icons as a reference
// and ensure they are imported where needed.

// List of common icons used (for reference, actual imports are in components):
// ShieldEllipsis, User, Mail, KeyRound, UserPlus, LogIn, Rocket, Star,
// Users, CalendarDays, Trophy, MessageSquare, Flag, Settings, Construction,
// Home, Eye, ShieldPlus, UploadCloud, Link2, ImagePlus, AlertTriangle, Edit3,
// Edit, ShieldX, Loader2, Shield, Swords, Heart, FileText, Copy, CheckCircle,
// XCircle, Hash, ImageIcon, ChevronLeft, ChevronRight, Search, KeyRound,
// Gamepad2, Wand2, MoreVertical, UserCog, Crown, BadgeCent, Clock,
// ArrowUpDown, SlidersHorizontal, Download, ChevronsLeft, ChevronsRight,
// ClipboardList, ListFilter, UsersRound, PanelLeft, UserCircle, ShieldCheck,
// Bell, Info, CalendarIcon (as CalendarIconLucide), PlusCircle (as PlusCircleIcon),
// Trash2, Save

// If we ever need a custom icon, e.g. an InfoCircle that's different from Lucide's Info:
import { Info } from 'lucide-react';

// Custom or aliased icons can be exported from here
export const InfoCircle = Info; // Example alias

// Add any other custom SVG icon components or re-exported Lucide icons below.
