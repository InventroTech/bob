  <nav className="flex-1 space-y-2">
    {/* Profile link */}
    <NavLink
      to={`/app/${tenantSlug}/profile`}
      className="block px-2 py-1 rounded hover:bg-gray-200"
      activeClassName="bg-gray-200"
    >
      Profile
    </NavLink>
    <NavLink
      to={`/app/${tenantSlug}`}
      end
      className="block px-2 py-1 rounded hover:bg-gray-200"
      activeClassName="bg-gray-200"
    >
      Dashboard
    </NavLink>
  </nav> 