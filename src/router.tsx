import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Dashboard from './dashboard';
import ImportCSV from './import';
import Tasks from './tasks';

const Routing = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/import" element={<ImportCSV />} />
        <Route path='/tasks' element={<Tasks/>}/>
      </Routes>
    </Router>
  );
};

export default Routing;