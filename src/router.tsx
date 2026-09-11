import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Dashboard from './dashboard';
import ImportCSV from './import';

const Routing = () => {
  return (
    <Router>
      <Routes>
        <Route path="/crmstrona/" element={<Dashboard />} />
        <Route path="/crmstrona/import" element={<ImportCSV />} />
      </Routes>
    </Router>
  );
};

export default Routing;