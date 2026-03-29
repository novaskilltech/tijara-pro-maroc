// This page is now replaced by sub-pages. Redirect to commandes.
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Achats = () => {
  const navigate = useNavigate();
  useEffect(() => { navigate("/achats/demandes", { replace: true }); }, [navigate]);
  return null;
};

export default Achats;
