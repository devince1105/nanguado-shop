import { create } from "zustand";

type UiState = {
  isCartOpen: boolean;
  isSearchOpen: boolean;
  isMobileMenuOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  isCartOpen: false,
  isSearchOpen: false,
  isMobileMenuOpen: false,
  openCart: () =>
    set({ isCartOpen: true, isSearchOpen: false, isMobileMenuOpen: false }),
  closeCart: () => set({ isCartOpen: false }),
  openSearch: () =>
    set({ isSearchOpen: true, isCartOpen: false, isMobileMenuOpen: false }),
  closeSearch: () => set({ isSearchOpen: false }),
  toggleMobileMenu: () =>
    set((s) => ({
      isMobileMenuOpen: !s.isMobileMenuOpen,
      isCartOpen: false,
      isSearchOpen: false,
    })),
  closeMobileMenu: () => set({ isMobileMenuOpen: false }),
}));
