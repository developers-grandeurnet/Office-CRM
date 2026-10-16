import { useBrand } from "../context/BrandContext";

const LOGIN_SIDE_IMAGE = "/login-side.jpg";

export const AuthLayout = ({ children }) => {
  const { brand } = useBrand();
  const companyName = brand.companyName || "AK Techs";

  return (
    <div className="auth-body grid min-h-screen w-full overflow-hidden bg-white text-slate-900 lg:grid-cols-2">
      {/* Left: image only */}
      <aside className="relative hidden min-h-screen overflow-hidden lg:block">
        <img
          src={LOGIN_SIDE_IMAGE}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      </aside>

      {/* Right: centered sign-in */}
      <section className="relative flex min-h-screen flex-col bg-white px-6 py-8 sm:px-10 lg:px-16 xl:px-20">
        <header className="flex items-center gap-2.5">
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt="" className="h-9 w-9 rounded-md object-contain" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#0f2744] text-sm font-bold text-white">
              {companyName.charAt(0)}
            </div>
          )}
          <span className="auth-display text-[17px] font-bold tracking-tight text-[#0f2744]">
            {companyName}
          </span>
        </header>

        <div className="flex flex-1 items-center justify-center">
          <div className="auth-rise w-full max-w-[400px]">{children}</div>
        </div>

        <footer className="text-center text-[13px] font-medium text-slate-400 lg:text-left">
          © {new Date().getFullYear()} {companyName}
        </footer>
      </section>
    </div>
  );
};
