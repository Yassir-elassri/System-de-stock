// Modern Invoice Template Component
export const generateModernInvoiceHTML = (sale: any) => {
  const totalLaborCost = sale.items?.reduce((sum: number, item: any) => sum + (item.additional_price || 0), 0) || 0;
  const totalProductsCost = sale.items?.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0) || 0;
  
  return `
    <!DOCTYPE html>
    <html lang="fr" dir="ltr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Facture de Vente #${sale.id}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', 'Tahoma', 'Arial', sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 10px;
          color: #2d3748;
          line-height: 1.4;
        }
        
        .invoice-wrapper {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          overflow: hidden;
          position: relative;
        }
        
        .invoice-wrapper::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4);
        }
        
        .invoice-header {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #06b6d4 100%);
          color: white;
          padding: 20px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        
        .invoice-header::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          animation: float 6s ease-in-out infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
          50% { transform: translate(-50%, -50%) rotate(180deg); }
        }
        
        .invoice-title {
          font-size: 28px;
          font-weight: 800;
          margin: 0 0 8px 0;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          position: relative;
          z-index: 1;
        }
        
        .invoice-subtitle {
          font-size: 16px;
          opacity: 0.95;
          margin: 0;
          position: relative;
          z-index: 1;
        }
        
        .invoice-number {
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(255,255,255,0.2);
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 14px;
          backdrop-filter: blur(10px);
        }
        
        .invoice-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          padding: 20px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .detail-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .detail-label {
          font-size: 12px;
          color: #64748b;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .detail-value {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          padding: 8px 0;
          border-bottom: 2px solid #e2e8f0;
        }
        
        .invoice-content {
          padding: 20px;
        }
        
        .invoice-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
        }
        
        .invoice-table thead {
          background: linear-gradient(135deg, #1e40af, #3b82f6);
          color: white;
        }
        
        .invoice-table th {
          padding: 8px 6px;
          text-align: center;
          font-weight: 700;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .invoice-table td {
          padding: 8px 6px;
          text-align: center;
          border-bottom: 1px solid #f1f5f9;
          font-size: 12px;
        }
        
        .invoice-table tbody tr:hover {
          background-color: #f8fafc;
        }
        
        .product-row {
          background: white;
        }
        
        .labor-row {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          border-left: 4px solid #f59e0b;
          font-style: italic;
        }
        
        .labor-row td {
          color: #92400e;
          font-weight: 600;
        }
        
        .costs-breakdown {
          margin: 15px 0;
          padding: 15px;
          background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
          border: 2px solid #0ea5e9;
          border-radius: 8px;
          box-shadow: 0 2px 4px -1px rgba(14, 165, 233, 0.1);
        }
        
        .costs-title {
          font-size: 16px;
          font-weight: 700;
          color: #0c4a6e;
          margin-bottom: 10px;
          text-align: center;
        }
        
        .costs-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        
        .cost-item {
          padding: 10px;
          border-radius: 6px;
          text-align: center;
          transition: transform 0.2s ease;
        }
        
        .cost-item:hover {
          transform: translateY(-2px);
        }
        
        .cost-item.products {
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          border: 2px solid #3b82f6;
        }
        
        .cost-item.labor {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          border: 2px solid #f59e0b;
        }
        
        .cost-label {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .cost-label.products {
          color: #1e40af;
        }
        
        .cost-label.labor {
          color: #92400e;
        }
        
        .cost-amount {
          font-size: 18px;
          font-weight: 800;
          margin: 0;
        }
        
        .cost-amount.products {
          color: #1e40af;
        }
        
        .cost-amount.labor {
          color: #92400e;
        }
        
        .labor-summary {
          margin: 10px 0;
          padding: 10px;
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          border: 2px solid #f59e0b;
          border-radius: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 4px -1px rgba(245, 158, 11, 0.2);
        }
        
        .labor-summary-label {
          font-size: 14px;
          font-weight: 700;
          color: #92400e;
        }
        
        .labor-summary-amount {
          font-size: 20px;
          font-weight: 800;
          color: #92400e;
        }
        
        .invoice-total {
          margin: 15px 0;
          padding: 15px;
          background: linear-gradient(135deg, #1e40af, #3b82f6);
          color: white;
          border-radius: 8px;
          text-align: center;
          box-shadow: 0 4px 12px -3px rgba(30, 64, 175, 0.3);
        }
        
        .total-label {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 4px;
          opacity: 0.9;
        }
        
        .total-amount {
          font-size: 24px;
          font-weight: 800;
          margin: 0;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .payment-details {
          margin: 15px 0;
          padding: 15px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }
        
        .payment-title {
          font-size: 14px;
          font-weight: 700;
          color: #374151;
          margin-bottom: 10px;
          text-align: center;
        }
        
        .payment-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 10px;
        }
        
        .payment-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .payment-label {
          font-weight: 600;
          color: #64748b;
        }
        
        .payment-value {
          font-weight: 700;
          color: #1e293b;
        }
        
        .mixed-payment {
          margin: 20px 0;
          padding: 20px;
          background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
          border: 2px solid #0ea5e9;
          border-radius: 8px;
        }
        
        .mixed-payment-title {
          font-size: 16px;
          font-weight: 700;
          color: #0c4a6e;
          margin-bottom: 15px;
          text-align: center;
        }
        
        .mixed-payment-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        
        .mixed-payment-item {
          text-align: center;
          padding: 15px;
          border-radius: 8px;
          background: white;
        }
        
        .mixed-payment-label {
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .mixed-payment-amount {
          font-size: 20px;
          font-weight: 800;
          margin: 0;
        }
        
        .mixed-payment-amount.cash {
          color: #059669;
        }
        
        .mixed-payment-amount.credit {
          color: #7c3aed;
        }
        
        .notes-section {
          margin: 30px 0;
          padding: 20px;
          background: #fefce8;
          border: 1px solid #facc15;
          border-radius: 8px;
        }
        
        .notes-title {
          font-size: 16px;
          font-weight: 700;
          color: #a16207;
          margin-bottom: 10px;
        }
        
        .notes-content {
          color: #a16207;
          font-style: italic;
        }
        
        .footer {
          background: #1e293b;
          color: white;
          padding: 15px;
          text-align: center;
        }
        
        .footer-title {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 5px;
        }
        
        .footer-subtitle {
          font-size: 12px;
          opacity: 0.8;
          margin-bottom: 8px;
        }
        
        .footer-info {
          font-size: 12px;
          opacity: 0.7;
        }
        
        @media print {
          body {
            background: white;
            padding: 0;
            margin: 0;
            font-size: 10px;
            line-height: 1.2;
          }
          .invoice-wrapper {
            box-shadow: none;
            border-radius: 0;
            max-width: 100%;
            margin: 0;
          }
          .invoice-header::before {
            display: none;
          }
          .invoice-header {
            padding: 8px;
          }
          .invoice-title {
            font-size: 18px;
          }
          .invoice-subtitle {
            font-size: 12px;
          }
          .invoice-details {
            padding: 8px;
            gap: 10px;
          }
          .invoice-content {
            padding: 8px;
          }
          .invoice-table {
            margin: 5px 0;
          }
          .invoice-table th,
          .invoice-table td {
            padding: 2px 3px;
            font-size: 9px;
          }
          .costs-breakdown {
            margin: 5px 0;
            padding: 5px;
          }
          .costs-title {
            font-size: 12px;
            margin-bottom: 5px;
          }
          .costs-grid {
            gap: 5px;
          }
          .cost-item {
            padding: 5px;
          }
          .cost-label {
            font-size: 10px;
            margin-bottom: 3px;
          }
          .cost-amount {
            font-size: 14px;
          }
          .labor-summary {
            margin: 5px 0;
            padding: 5px;
          }
          .labor-summary-label {
            font-size: 10px;
          }
          .labor-summary-amount {
            font-size: 14px;
          }
          .invoice-total {
            margin: 5px 0;
            padding: 8px;
          }
          .total-label {
            font-size: 12px;
          }
          .total-amount {
            font-size: 18px;
          }
          .payment-details {
            margin: 5px 0;
            padding: 5px;
          }
          .payment-title {
            font-size: 12px;
            margin-bottom: 5px;
          }
          .payment-info {
            gap: 5px;
          }
          .payment-item {
            padding: 3px 0;
          }
          .payment-label {
            font-size: 10px;
          }
          .payment-value {
            font-size: 10px;
          }
          .mixed-payment {
            margin: 10px 0;
            padding: 10px;
          }
          .mixed-payment-title {
            font-size: 12px;
            margin-bottom: 8px;
          }
          .mixed-payment-grid {
            gap: 10px;
          }
          .mixed-payment-item {
            padding: 8px;
          }
          .mixed-payment-label {
            font-size: 10px;
            margin-bottom: 5px;
          }
          .mixed-payment-amount {
            font-size: 14px;
          }
          .notes-section {
            margin: 10px 0;
            padding: 8px;
          }
          .notes-title {
            font-size: 12px;
            margin-bottom: 5px;
          }
          .notes-content {
            font-size: 10px;
          }
          .footer {
            padding: 5px;
          }
          .footer-title {
            font-size: 10px;
            margin-bottom: 3px;
          }
          .footer-subtitle {
            font-size: 9px;
            margin-bottom: 3px;
          }
          .footer-info {
            font-size: 8px;
          }
          .page-break {
            page-break-before: always;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-wrapper">
        <div class="invoice-header">
          <div class="invoice-number">#${sale.id}</div>
          <div class="invoice-title">FACTURE / فاتورة</div>
          <div class="invoice-subtitle">Gestion Droguerie - Système de Gestion de Stock</div>
        </div>
        
        <div class="invoice-details">
          <div class="detail-section">
            <div class="detail-item">
              <div class="detail-label">N° Facture / رقم الفاتورة</div>
              <div class="detail-value">#${sale.id}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Date / التاريخ</div>
              <div class="detail-value">${new Date(sale.sale_date).toLocaleDateString('fr-FR')}</div>
            </div>
          </div>
          <div class="detail-section">
            <div class="detail-item">
              <div class="detail-label">Client / عميل</div>
              <div class="detail-value">${sale.client_name || 'Non spécifié'}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Vendeur / البائع</div>
              <div class="detail-value">Système</div>
            </div>
          </div>
        </div>
        
        <div class="invoice-content">
          <table class="invoice-table">
            <thead>
              <tr>
                <th>N° / رقم</th>
                <th>Désignation / البيان</th>
                <th>Quantité / الكمية</th>
                <th>Prix Unitaire / السعر (DH)</th>
                <th>Montant / المبلغ (DH)</th>
              </tr>
            </thead>
            <tbody>
              ${sale.items && sale.items.length > 0 ? 
                sale.items.map((item: any, index: number) => {
                  const basePrice = item.quantity * item.unit_price;
                  const laborCost = item.additional_price || 0;
                  
                  return `
                    <tr class="product-row">
                      <td>${index + 1}</td>
                      <td style="text-align: left; font-weight: 600;">${item.product_name || 'Produit'}</td>
                      <td>${item.quantity}</td>
                      <td>${item.unit_price.toFixed(2)}</td>
                      <td style="font-weight: 600;">${basePrice.toFixed(2)}</td>
                    </tr>
                    ${laborCost > 0 ? `
                      <tr class="labor-row">
                        <td></td>
                        <td style="text-align: left; padding-left: 30px;">+ Main d'œuvre</td>
                        <td>-</td>
                        <td>${laborCost.toFixed(2)}</td>
                        <td style="font-weight: 700;">${laborCost.toFixed(2)}</td>
                      </tr>
                    ` : ''}
                  `;
                }).join('') : 
                '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #64748b;">Aucun article</td></tr>'
              }
            </tbody>
          </table>
          
          ${totalLaborCost > 0 ? `
            <div class="costs-breakdown">
              <div class="costs-title">Détail des Coûts / تفاصيل التكاليف</div>
              <div class="costs-grid">
                <div class="cost-item products">
                  <div class="cost-label products">Produits / المنتجات</div>
                  <div class="cost-amount products">${totalProductsCost.toFixed(2)} DH</div>
                </div>
                <div class="cost-item labor">
                  <div class="cost-label labor">Main d'œuvre / العمالة</div>
                  <div class="cost-amount labor">${totalLaborCost.toFixed(2)} DH</div>
                </div>
              </div>
            </div>
            
            <div class="labor-summary">
              <div class="labor-summary-label">Main d'œuvre / العمالة:</div>
              <div class="labor-summary-amount">${totalLaborCost.toFixed(2)} DH</div>
            </div>
          ` : ''}
          
          <div class="invoice-total">
            <div class="total-label">Total Général / المجموع العام</div>
            <div class="total-amount">${sale.total_amount.toFixed(2)} DH</div>
          </div>
          
          <div class="payment-details">
            <div class="payment-title">Détails de la Vente / تفاصيل البيع</div>
            <div class="payment-info">
              <div class="payment-item">
                <div class="payment-label">Méthode de Paiement / طريقة الدفع:</div>
                <div class="payment-value">${
                  sale.payment_method === 'cash' ? 'Espèces / نقداً' : 
                  sale.payment_method === 'credit' ? 'Crédit / ائتمان' : 
                  'Paiement Mixte / دفع مختلط'
                }</div>
              </div>
              <div class="payment-item">
                <div class="payment-label">Nombre d'Articles / عدد المواد:</div>
                <div class="payment-value">${sale.items?.length || 0}</div>
              </div>
            </div>
            
            ${sale.payment_method === 'mixed' ? `
              <div class="mixed-payment">
                <div class="mixed-payment-title">Détails du Paiement / تفاصيل الدفع</div>
                <div class="mixed-payment-grid">
                  <div class="mixed-payment-item">
                    <div class="mixed-payment-label">Espèces / نقداً</div>
                    <div class="mixed-payment-amount cash">${sale.cash_amount?.toFixed(2) || '0.00'} DH</div>
                  </div>
                  <div class="mixed-payment-item">
                    <div class="mixed-payment-label">Crédit / ائتمان</div>
                    <div class="mixed-payment-amount credit">${sale.credit_amount?.toFixed(2) || '0.00'} DH</div>
                  </div>
                </div>
              </div>
            ` : ''}
            
            ${sale.notes ? `
              <div class="notes-section">
                <div class="notes-title">Notes / ملاحظات</div>
                <div class="notes-content">${sale.notes}</div>
              </div>
            ` : ''}
          </div>
        </div>
        
        <div class="footer">
          <div class="footer-title">Merci pour votre confiance / شكراً لتفتكم</div>
          <div class="footer-subtitle">Gestion Droguerie - Système de Gestion de Stock</div>
          <div class="footer-info">
            Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};
