import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-auto">
      <div className="bg-amazon-dark text-white text-center py-8">
        <Link to="/ai" className="amazon-btn inline-block mb-6">Back to AI Dashboard</Link>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-sm px-4">
          <div>
            <h4 className="font-bold mb-2">Get to Know Us</h4>
            <ul className="space-y-1 text-gray-300">
              <li>About Amazon Now</li>
              <li>AI Shopping Agent</li>
              <li>ReStock AI</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-2">Shop</h4>
            <ul className="space-y-1 text-gray-300">
              <li><Link to="/category/snacks">Snacks</Link></li>
              <li><Link to="/category/medicine">Health</Link></li>
              <li><Link to="/category/cleaning">Cleaning</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-2">AI Features</h4>
            <ul className="space-y-1 text-gray-300">
              <li>Intent Shopping</li>
              <li>Voice Mode</li>
              <li>ReStock Predictions</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-2">Help</h4>
            <ul className="space-y-1 text-gray-300">
              <li>Your Orders</li>
              <li>Returns</li>
              <li>Customer Service</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="bg-amazon-navy text-gray-400 text-xs text-center py-4">
        © 2026 Amazon Now AI Shopping Agent + ReStock AI. Demo project.
      </div>
    </footer>
  );
}
