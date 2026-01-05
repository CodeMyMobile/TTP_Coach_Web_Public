import React, { useEffect, useState } from 'react';
import CoachDashboard from './CoachDashboard';
import CoachPlayerDetail from './CoachPlayerDetail';

const parseHashRoute = (hash) => {
  const path = hash.replace(/^#/, '') || '/coach/dashboard';
  const segments = path.split('/').filter(Boolean);

  if (segments[0] !== 'coach') {
    return { path: '/coach/dashboard', params: {} };
  }

  if (segments[1] === 'players' && segments[2]) {
    return { path: '/coach/players/:playerId', params: { playerId: segments[2] } };
  }

  if (segments[1] === 'dashboard' && segments[2] === 'lesson' && segments[3]) {
    return { path: '/coach/dashboard/lesson/:id', params: { id: segments[3] } };
  }

  return { path: '/coach/dashboard', params: {} };
};

const useHashRoute = () => {
  const [route, setRoute] = useState(() => parseHashRoute(window.location.hash));

  useEffect(() => {
    const handleChange = () => setRoute(parseHashRoute(window.location.hash));
    window.addEventListener('hashchange', handleChange);
    return () => window.removeEventListener('hashchange', handleChange);
  }, []);

  return route;
};

const CoachRoutes = ({ coach }) => {
  const route = useHashRoute();

  if (route.path === '/coach/players/:playerId') {
    return (
      <CoachPlayerDetail
        playerId={route.params.playerId}
        coachId={coach?.id}
        onBack={() => {
          window.location.hash = '#/coach/dashboard';
        }}
      />
    );
  }

  return (
    <CoachDashboard
      coach={coach}
      coachId={coach?.id}
      deepLinkLessonId={route.params.id}
      onSelectPlayer={(player) => {
        const playerId = player?.id || player?.player_id || player?.playerId;
        if (playerId) {
          window.location.hash = `#/coach/players/${playerId}`;
        }
      }}
      onScheduleLesson={() => {
        window.location.hash = '#/coach/dashboard';
      }}
      onAddPlayer={() => {
        window.location.hash = '#/coach/dashboard';
      }}
    />
  );
};

export default CoachRoutes;
