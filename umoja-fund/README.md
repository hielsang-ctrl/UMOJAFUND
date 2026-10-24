# Umoja Group Fund

React + Tailwind frontend for managing group contributions, expenses and proof of work.

    npm install
    npm run dev

## Structure
    src/
      main.jsx                  entry, router + provider
      App.jsx                   route table
      config/navigation.js      nav items (used by top nav and side rail)
      context/FundContext.jsx   shared state + actions (replace with API calls)
      data/mockData.js          seed data
      utils/format.js           helpers
      components/ui/            small reusable pieces
      components/layout/        AppLayout, TopNav, SideRail
      pages/                    one file per page
