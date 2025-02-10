import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Navbar } from "./components/NavBar";
import { AuthProvider } from "./context/AuthContext";
import AuthorReportForm from "./pages/AuthorReportForm";
import CitationGraph from "./pages/CitationMapReferencesPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SearcherPage from "./pages/SearcherPage";
import { ProtectedRoute } from "./routes";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
      <Navbar/>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
          <Route path="/impact" element={<AuthorReportForm />} />
          <Route path="/searcher" element={<SearcherPage />} />
          <Route path="/map" element={<CitationGraph />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
