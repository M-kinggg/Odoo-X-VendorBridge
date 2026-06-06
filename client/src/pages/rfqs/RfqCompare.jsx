import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../services/api';
import { ArrowLeft, Star, Scale, CheckCircle, AlertCircle, Award, Compass, Timer } from 'lucide-react';

const RfqCompare = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // 1. Fetch RFQ details (to get the list of line items)
  const { data: rfq, isLoading: rfqLoading, error: rfqError } = useQuery({
    queryKey: ['rfqCompareDetails', id],
    queryFn: async () => {
      const res = await api.get(`/rfqs/${id}`);
      return res.data;
    }
  });

  // 2. Fetch Quotations submitted for this RFQ
  const { data: quotations = [], isLoading: quotesLoading, error: quotesError } = useQuery({
    queryKey: ['rfqQuotations', id],
    queryFn: async () => {
      const res = await api.get(`/rfqs/${id}/quotations`);
      return res.data;
    }
  });

  // 3. Mutation: Initiate approval workflow
  const initiateApprovalMutation = useMutation({
    mutationFn: async (quoteId) => {
      return api.post('/approvals', { rfq_id: id, quotation_id: quoteId });
    },
    onSuccess: () => {
      navigate('/approvals');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to submit for approval.');
    }
  });

  const handleSelectQuote = (quoteId) => {
    if (window.confirm('Do you want to Select this quotation and initiate the Manager approval workflow?')) {
      initiateApprovalMutation.mutate(quoteId);
    }
  };

  if (rfqLoading || quotesLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 rounded"></div>
        <div className="h-96 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  if (rfqError || quotesError) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 shadow-sm rounded-2xl">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-md font-bold text-slate-800">Comparison Failed</h3>
        <p className="text-slate-500 text-sm mt-1 mb-4">Failed to load quotations comparison data.</p>
        <button onClick={() => navigate(`/rfqs/${id}`)} className="btn-secondary text-sm">
          Return to RFQ
        </button>
      </div>
    );
  }

  // Find lowest price details
  const rfqItems = rfq?.items || [];
  
  // Find minimum unit price per rfq_item_id
  const lowestUnitPrices = {};
  rfqItems.forEach(item => {
    let minPrice = Infinity;
    quotations.forEach(q => {
      const line = q.quotation_items?.find(qi => qi.rfq_item_id === item.id);
      if (line && parseFloat(line.unit_price) < minPrice) {
        minPrice = parseFloat(line.unit_price);
      }
    });
    lowestUnitPrices[item.id] = minPrice;
  });

  // Find overall cheapest quote
  let cheapestQuoteId = null;
  let minTotal = Infinity;
  quotations.forEach(q => {
    if (parseFloat(q.total_price) < minTotal) {
      minTotal = parseFloat(q.total_price);
      cheapestQuoteId = q.id;
    }
  });

  const renderStars = (rating = 3) => {
    return (
      <div className="flex gap-0.5 text-amber-400">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${star <= rating ? 'fill-amber-400' : 'text-slate-200'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Return link */}
      <div>
        <button
          onClick={() => navigate(`/rfqs/${id}`)}
          className="text-xs font-bold text-slate-500 hover:text-brand-600 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to RFQ Detail
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-center text-brand-600 shadow-sm shrink-0">
          <Scale className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Quotations Comparison Matrix</h1>
          <p className="text-slate-500 text-sm mt-0.5">RFQ: "{rfq.title}" • Evaluated unit pricing side-by-side.</p>
        </div>
      </div>

      {quotations.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-md font-bold text-slate-800">No Quotations Submitted</h3>
          <p className="text-slate-500 text-sm max-w-xs mx-auto mt-1">
            We are awaiting bid responses from invited vendor partners. Check back once vendor profiles update to submitted.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                {/* Header row: Vendor Names */}
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-5 text-sm font-bold text-slate-500">RFQ Line Items</th>
                  {quotations.map((q) => {
                    const isCheapest = q.id === cheapestQuoteId;
                    return (
                      <th key={q.id} className="px-6 py-5 border-l border-slate-100 min-w-[200px] relative">
                        {isCheapest && (
                          <span className="absolute top-2 right-4 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold border border-emerald-200 uppercase tracking-wide flex items-center gap-0.5">
                            <Award className="w-3 h-3 text-emerald-600" /> Best Price
                          </span>
                        )}
                        <div className="font-extrabold text-slate-800">{q.vendors?.name}</div>
                        <div className="mt-1">{renderStars(q.vendors?.rating)}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-600">
                {/* Line Item Rows */}
                {rfqItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/20">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 text-xs">{item.product_name}</div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Qty: {parseFloat(item.quantity)} {item.unit}</div>
                    </td>
                    {quotations.map((q) => {
                      const line = q.quotation_items?.find(qi => qi.rfq_item_id === item.id);
                      if (!line) {
                        return <td key={q.id} className="px-6 py-4 border-l border-slate-100 text-slate-400 text-xs italic">N/A</td>;
                      }

                      const uPrice = parseFloat(line.unit_price);
                      const isLowest = uPrice === lowestUnitPrices[item.id];

                      return (
                        <td
                          key={q.id}
                          className={`px-6 py-4 border-l border-slate-100 ${
                            isLowest ? 'bg-emerald-50/40 text-emerald-800 font-bold' : ''
                          }`}
                        >
                          <div className="text-xs font-semibold">${uPrice.toFixed(2)} / unit</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Total: ${parseFloat(line.total_price).toFixed(2)}</div>
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Summary Row A: Delivery Timeline */}
                <tr className="bg-slate-50/20 font-bold border-t border-slate-200">
                  <td className="px-6 py-4 text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <Timer className="w-4 h-4 text-slate-400" /> Delivery Days
                  </td>
                  {quotations.map((q) => (
                    <td key={q.id} className="px-6 py-4 border-l border-slate-100 text-slate-800 text-xs">
                      {q.delivery_days} calendar days
                    </td>
                  ))}
                </tr>

                {/* Summary Row B: Grand Total */}
                <tr className="bg-slate-50/40 font-extrabold border-t border-slate-200">
                  <td className="px-6 py-4 text-xs uppercase tracking-wider text-slate-500">Grand Total Price</td>
                  {quotations.map((q) => {
                    const isCheapest = q.id === cheapestQuoteId;
                    return (
                      <td
                        key={q.id}
                        className={`px-6 py-4 border-l border-slate-100 text-md ${
                          isCheapest ? 'text-emerald-700 font-black' : 'text-slate-800'
                        }`}
                      >
                        ${parseFloat(q.total_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    );
                  })}
                </tr>

                {/* Selection Row */}
                <tr className="border-t border-slate-200">
                  <td className="px-6 py-4"></td>
                  {quotations.map((q) => (
                    <td key={q.id} className="px-6 py-4 border-l border-slate-100">
                      <button
                        onClick={() => handleSelectQuote(q.id)}
                        disabled={initiateApprovalMutation.isLoading}
                        className="w-full text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-2 shadow-md hover:shadow-brand-500/10 transition-all active:scale-[0.98] disabled:opacity-50"
                      >
                        Select Quote
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default RfqCompare;
