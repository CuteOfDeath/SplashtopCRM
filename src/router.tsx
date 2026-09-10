import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Dashboard from './dashboard';
import ImportCSV from './import';

const Routing = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/import" element={<ImportCSV />} />
      </Routes>
    </Router>
  );
};

export default Routing;