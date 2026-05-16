import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import LoadingScreen from './components/ui/LoadingScreen';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

const DashboardLayout = lazy(() => import('./components/layout/DashboardLayout'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const TrackingPage = lazy(() => import('./pages/tracking/TrackingPage'));
const VehiclesPage = lazy(() => import('./pages/vehicles/VehiclesPage'));
const DevicesPage = lazy(() => import('./pages/devices/DevicesPage'));
const HistoryPage = lazy(() => import('./pages/history/HistoryPage'));
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage'));
const GeofencesPage = lazy(() => import('./pages/geofences/GeofencesPage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const DriversPage = lazy(() => import('./pages/drivers/DriversPage'));
const ShipmentsPage = lazy(() => import('./pages/shipments/ShipmentsPage'));
const FuelPage         = lazy(() => import('./pages/fuel/FuelPage'));
const MaintenancePage  = lazy(() => import('./pages/maintenance/MaintenancePage'));
const ExpensesPage     = lazy(() => import('./pages/expenses/ExpensesPage'));
const TripLogPage      = lazy(() => import('./pages/trips/TripLogPage'));
const ActivityLogPage = lazy(() => import('./pages/activity-log/ActivityLogPage'));
const SimulatorPage   = lazy(() => import('./pages/simulator/SimulatorPage'));
const SafetyPage      = lazy(() => import('./pages/safety/SafetyPage'));
const CompliancePage  = lazy(() => import('./pages/compliance/CompliancePage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const AlertRulesPage    = lazy(() => import('./pages/alert-rules/AlertRulesPage'));
const UtilizationPage   = lazy(() => import('./pages/utilization/UtilizationPage'));
const AssignmentsPage   = lazy(() => import('./pages/assignments/AssignmentsPage'));
const IdleTimePage           = lazy(() => import('./pages/idle-time/IdleTimePage'));
const ScheduledReportsPage   = lazy(() => import('./pages/scheduled-reports/ScheduledReportsPage'));
const TeamPage               = lazy(() => import('./pages/team/TeamPage'));
const IncidentsPage          = lazy(() => import('./pages/incidents/IncidentsPage'));
const FuelEfficiencyPage     = lazy(() => import('./pages/fuel-efficiency/FuelEfficiencyPage'));
const CalendarPage           = lazy(() => import('./pages/calendar/CalendarPage'));
const RoutePlansPage         = lazy(() => import('./pages/route-plans/RoutePlansPage'));
const EmissionsPage          = lazy(() => import('./pages/emissions/EmissionsPage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />

        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <NotificationProvider>
                <DashboardLayout />
              </NotificationProvider>
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="tracking" element={<TrackingPage />} />
          <Route path="vehicles" element={<VehiclesPage />} />
          <Route path="devices" element={<DevicesPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="geofences" element={<GeofencesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="drivers" element={<DriversPage />} />
          <Route path="shipments" element={<ShipmentsPage />} />
          <Route path="fuel" element={<FuelPage />} />
          <Route path="maintenance" element={<MaintenancePage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="trips" element={<TripLogPage />} />
          <Route path="activity-log" element={<ActivityLogPage />} />
          <Route path="simulator" element={<SimulatorPage />} />
          <Route path="safety" element={<SafetyPage />} />
          <Route path="compliance" element={<CompliancePage />} />
          <Route path="alert-rules"  element={<AlertRulesPage />} />
          <Route path="utilization"  element={<UtilizationPage />} />
          <Route path="assignments"  element={<AssignmentsPage />} />
          <Route path="idle-time"        element={<IdleTimePage />} />
          <Route path="scheduled-reports" element={<ScheduledReportsPage />} />
          <Route path="team"             element={<TeamPage />} />
          <Route path="incidents"        element={<IncidentsPage />} />
          <Route path="fuel-efficiency"  element={<FuelEfficiencyPage />} />
          <Route path="calendar"         element={<CalendarPage />} />
          <Route path="route-plans"      element={<RoutePlansPage />} />
          <Route path="emissions"        element={<EmissionsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
