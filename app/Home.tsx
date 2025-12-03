"use client";

import React from "react";
import BusinessInsightsPage from "./business-insights/page";

const Home = React.memo(() => {
  return <BusinessInsightsPage />;
});

Home.displayName = 'Home';

export default Home;
