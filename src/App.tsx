import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import TransferSendenPage from '@/pages/TransferSendenPage';
import TransfersPage from '@/pages/TransfersPage';
import EmpfaengerPage from '@/pages/EmpfaengerPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardOverview />} />
          <Route path="transfer-senden" element={<TransferSendenPage />} />
          <Route path="transfers" element={<TransfersPage />} />
          <Route path="empfaenger" element={<EmpfaengerPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}