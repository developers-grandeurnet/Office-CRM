import { BrowserRouter as Router } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AppRoutes } from "./routes/AppRoutes";
import { AuthProvider } from "./context/AuthContext";
import { BrandProvider } from "./context/BrandContext";

function App() {
  return (
    <AuthProvider>
      <Router>
        <BrandProvider>
          <Toaster position="top-right" />
          <AppRoutes />
        </BrandProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;
