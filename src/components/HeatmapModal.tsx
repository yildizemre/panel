// --- START OF NEW FILE src/components/HeatmapModal.tsx ---

import React from 'react';
import { motion } from 'framer-motion';
import { X, GitCompareArrows } from 'lucide-react';

// Bileşenin alacağı propları tanımlıyoruz
interface HeatmapModalProps {
  mainHeatmap: any;
  comparisonHeatmap: any | null;
  isCompareView: boolean;
  comparisonOptions: any[];
  onClose: () => void;
  onStartCompare: () => void;
  onSelectForCompare: (heatmap: any) => void;
  onCancelCompare: () => void;
}

const HeatmapModal: React.FC<HeatmapModalProps> = ({
  mainHeatmap,
  comparisonHeatmap,
  isCompareView,
  comparisonOptions,
  onClose,
  onStartCompare,
  onSelectForCompare,
  onCancelCompare,
}) => {
  if (!mainHeatmap) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-800 rounded-xl max-w-4xl w-full mx-4 border border-slate-700 flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white">
            {isCompareView ? `Karşılaştırma için Saat Seç (${mainHeatmap.date})` : 'Isı Haritası Görüntüsü'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-grow p-4 overflow-y-auto">
          {isCompareView ? (
            // KARŞILAŞTIRMA İÇİN SEÇİM EKRANI
            <div>
              <p className="text-slate-300 mb-4 text-center">
                <span className="font-bold text-white">{mainHeatmap.time}</span> saatindeki görüntüyle karşılaştırmak için listeden başka bir saat seçin.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {comparisonOptions.length > 0 ? (
                  comparisonOptions.map(option => (
                    <button
                      key={option.time}
                      onClick={() => onSelectForCompare(option)}
                      className="bg-slate-700/50 rounded-lg p-3 text-center hover:bg-blue-600/50 border border-slate-600 hover:border-blue-500 transition-all"
                    >
                      <img src={option.image} alt={`Saat ${option.time}`} className="w-full h-20 object-cover rounded mb-2" />
                      <p className="font-semibold text-white">{option.time}</p>
                      <p className="text-xs text-slate-400">{option.visitors} ziyaretçi</p>
                    </button>
                  ))
                ) : (
                  <p className="col-span-full text-center text-slate-400 py-8">Bu tarih için karşılaştırılacak başka kayıt bulunamadı.</p>
                )}
              </div>
            </div>
          ) : (
            // GÖRÜNTÜLEME EKRANI (Tekli veya Yan Yana)
            <div className="flex flex-col md:flex-row gap-4">
              {/* Ana Görüntü */}
              <div className="flex-1">
                <h4 className="text-center font-bold text-white mb-2">{mainHeatmap.time}</h4>
                <img src={mainHeatmap.image} alt={`Saat ${mainHeatmap.time}`} className="w-full h-auto object-contain rounded-lg bg-black" />
                {/* <div className="text-center text-sm text-slate-400 mt-2">{mainHeatmap.visitors} Ziyaretçi | %{mainHeatmap.intensity} Yoğunluk</div> */}
              </div>
              
              {/* Karşılaştırma Görüntüsü */}
              {comparisonHeatmap && (
                <>
                  <div className="flex items-center justify-center">
                    <GitCompareArrows className="w-8 h-8 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-center font-bold text-white mb-2">{comparisonHeatmap.time}</h4>
                    <img src={comparisonHeatmap.image} alt={`Saat ${comparisonHeatmap.time}`} className="w-full h-auto object-contain rounded-lg bg-black" />
                    {/* <div className="text-center text-sm text-slate-400 mt-2">{comparisonHeatmap.visitors} Ziyaretçi | %{comparisonHeatmap.intensity} Yoğunluk</div> */}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex-shrink-0 flex justify-end items-center p-4 border-t border-slate-700 gap-3">
          {isCompareView && (
            <button onClick={onCancelCompare} className="px-4 py-2 text-sm text-slate-300 bg-slate-600 hover:bg-slate-500 rounded-lg">
              İptal
            </button>
          )}

          {!comparisonHeatmap && !isCompareView && (
            <button onClick={onStartCompare} className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg">
              <GitCompareArrows className="w-4 h-4" />
              Karşılaştır
            </button>
          )}

           {comparisonHeatmap && (
            <button onClick={onStartCompare} className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg">
              <GitCompareArrows className="w-4 h-4" />
              Başka Bir Saat Seç
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default HeatmapModal;

// --- END OF NEW FILE src/components/HeatmapModal.tsx ---