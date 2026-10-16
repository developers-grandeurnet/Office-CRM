import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const BrandContext = createContext({
  brand: { companyName: "", logoUrl: "", ringtoneUrl: "", ringtoneName: "" },
  refreshBrand: async () => {},
});

export function BrandProvider({ children }) {
  const [brand, setBrand] = useState({ companyName: "", logoUrl: "", ringtoneUrl: "", ringtoneName: "" });

  const refreshBrand = async () => {
    const res = await api.get("/settings/brand");
    setBrand({
      companyName: res.data.data?.companyName || "",
      logoUrl: res.data.data?.logoUrl || "",
      ringtoneUrl: res.data.data?.ringtoneUrl || "",
      ringtoneName: res.data.data?.ringtoneName || "",
    });
  };

  useEffect(() => {
    refreshBrand().catch(() => {});
  }, []);

  return (
    <BrandContext.Provider value={{ brand, refreshBrand }}>
      {children}
    </BrandContext.Provider>
  );
}

export const useBrand = () => useContext(BrandContext);
