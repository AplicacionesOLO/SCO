import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface ModuleCardProps {
  title: string;
  description: string;
  icon: string;
  color: string;
  gradient: string;
  value: string | number;
  subtitle: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'warning' | 'neutral';
  trend?: ReactNode;
  route?: string;
  loading?: boolean;
  onClick?: () => void;
}

export default function ModuleCard({
  title,
  description,
  icon,
  color,
  gradient,
  value,
  subtitle,
  change,
  changeType = 'neutral',
  trend,
  route,
  loading,
  onClick
}: ModuleCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    console.log(`[DASHBOARD CARD] 🎯 Click en card: ${title}`);
    
    if (onClick) {
      onClick();
    } else if (route) {
      console.log(`[DASHBOARD CARD] 🔗 Navegando a: ${route}`);
      navigate(route);
    }
  };

  const getChangeColor = () => {
    switch (changeType) {
      case 'positive':
        return 'text-green-600 bg-green-50';
      case 'negative':
        return 'text-red-600 bg-red-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getChangeIcon = () => {
    switch (changeType) {
      case 'positive':
        return 'ri-arrow-up-line';
      case 'negative':
        return 'ri-arrow-down-line';
      case 'warning':
        return 'ri-alert-line';
      default:
        return 'ri-information-line';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
        <div className={`h-2 ${gradient}`}></div>
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-48"></div>
            </div>
            <div className={`w-12 h-12 ${color} rounded-xl bg-opacity-10`}></div>
          </div>
          <div className="h-8 bg-gray-200 rounded w-24 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${
        (route || onClick) ? 'cursor-pointer' : ''
      }`}
    >
      {/* Barra superior de color */}
      <div className={`h-2 ${gradient}`}></div>

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {title}
            </h3>
            <p className="text-sm text-gray-500">
              {description}
            </p>
          </div>
          <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center bg-opacity-10 flex-shrink-0 ml-4`}>
            <i className={`${icon} text-2xl ${color.replace('bg-', 'text-')}`}></i>
          </div>
        </div>

        {/* Valor principal */}
        <div className="mb-3">
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {value}
          </div>
          <div className="text-sm text-gray-600">
            {subtitle}
          </div>
        </div>

        {/* Footer con cambio y tendencia */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          {change && (
            <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getChangeColor()}`}>
              <i className={`${getChangeIcon()} mr-1`}></i>
              {change}
            </div>
          )}
          {trend && (
            <div className="flex-1 ml-3">
              {trend}
            </div>
          )}
          {(route || onClick) && (
            <i className="ri-arrow-right-line text-gray-400 ml-auto"></i>
          )}
        </div>
      </div>
    </div>
  );
}
