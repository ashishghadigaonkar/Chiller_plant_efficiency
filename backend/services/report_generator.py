from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas
from datetime import datetime
import io
import matplotlib
matplotlib.use('Agg')  # Use non-GUI backend
import matplotlib.pyplot as plt
from typing import Optional, List

class ReportGenerator:
    """Generate professional PDF reports for chiller plant audits"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Create custom paragraph styles"""
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1A1A2E'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        self.styles.add(ParagraphStyle(
            name='CustomHeading',
            parent=self.styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#0F3460'),
            spaceAfter=12,
            spaceBefore=12,
            fontName='Helvetica-Bold'
        ))
        
        self.styles.add(ParagraphStyle(
            name='CustomBody',
            parent=self.styles['BodyText'],
            fontSize=11,
            textColor=colors.HexColor('#1A1A2E'),
            spaceAfter=6,
            alignment=TA_LEFT
        ))
        
        self.styles.add(ParagraphStyle(
            name='AlertBox',
            parent=self.styles['BodyText'],
            fontSize=12,
            textColor=colors.HexColor('#C70039'),
            spaceAfter=10,
            leftIndent=20,
            fontName='Helvetica-Bold'
        ))
    
    def _create_header_footer(self, canvas_obj, doc):
        """Add header and footer to each page"""
        canvas_obj.saveState()
        
        # Header
        canvas_obj.setFont('Helvetica-Bold', 10)
        canvas_obj.setFillColor(colors.HexColor('#0F3460'))
        canvas_obj.drawString(inch, A4[1] - 0.5*inch, "Chiller Plant Efficiency Audit Report")
        canvas_obj.drawRightString(A4[0] - inch, A4[1] - 0.5*inch, datetime.now().strftime("%Y-%m-%d %H:%M"))
        
        # Footer
        canvas_obj.setFont('Helvetica', 9)
        canvas_obj.setFillColor(colors.grey)
        canvas_obj.drawCentredString(A4[0] / 2, 0.5*inch, f"Page {doc.page}")
        canvas_obj.drawString(inch, 0.5*inch, "Confidential - Internal Use Only")
        
        canvas_obj.restoreState()
    
    def _create_kpi_chart(self, kw_per_tr: float, plant_kw_per_tr: float) -> Optional[str]:
        """Create a bar chart comparing efficiency metrics"""
        try:
            fig, ax = plt.subplots(figsize=(8, 4))
            
            categories = ['Chiller kW/TR', 'Plant kW/TR']
            values = [kw_per_tr, plant_kw_per_tr]
            colors_list = ['#66FCF1' if kw_per_tr < 0.6 else '#FFA500' if kw_per_tr < 0.8 else '#FF2E63',
                          '#66FCF1' if plant_kw_per_tr < 0.75 else '#FFA500' if plant_kw_per_tr < 0.95 else '#FF2E63']
            
            bars = ax.bar(categories, values, color=colors_list, alpha=0.8, edgecolor='black', linewidth=1.5)
            
            # Add benchmark lines
            ax.axhline(y=0.6, color='green', linestyle='--', linewidth=1, label='Chiller Excellent (0.6)')
            ax.axhline(y=0.75, color='blue', linestyle='--', linewidth=1, label='Plant Excellent (0.75)')
            
            # Add value labels on bars
            for bar in bars:
                height = bar.get_height()
                ax.text(bar.get_x() + bar.get_width()/2., height,
                       f'{height:.3f}',
                       ha='center', va='bottom', fontweight='bold', fontsize=12)
            
            ax.set_ylabel('kW/TR', fontsize=12, fontweight='bold')
            ax.set_title('Efficiency Metrics Comparison', fontsize=14, fontweight='bold', pad=20)
            ax.legend(loc='upper right', fontsize=9)
            ax.grid(axis='y', alpha=0.3)
            
            # Save to buffer
            buf = io.BytesIO()
            plt.tight_layout()
            plt.savefig(buf, format='png', dpi=150, bbox_inches='tight')
            buf.seek(0)
            plt.close()
            
            return buf
        except Exception as e:
            print(f"Error creating chart: {e}")
            return None
    
    def generate_manual_audit_report(self, audit_result) -> io.BytesIO:
        """Generate comprehensive audit report PDF"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4,
                               rightMargin=inch, leftMargin=inch,
                               topMargin=inch, bottomMargin=inch)
        
        story = []
        
        # Title
        title = Paragraph("CHILLER PLANT EFFICIENCY AUDIT REPORT", self.styles['CustomTitle'])
        story.append(title)
        story.append(Spacer(1, 0.3*inch))
        
        # Report metadata
        metadata = [
            ['Report Generated:', datetime.now().strftime("%Y-%m-%d %H:%M:%S")],
            ['Report Type:', 'Manual On-Site Audit'],
            ['Status:', audit_result.plant_efficiency_status.upper()]
        ]
        
        metadata_table = Table(metadata, colWidths=[2*inch, 4*inch])
        metadata_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#E8F4F8')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#1A1A2E')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(metadata_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Diagnostic Message
        story.append(Paragraph("DIAGNOSTIC SUMMARY", self.styles['CustomHeading']))
        diag_text = Paragraph(audit_result.diagnostic_message, self.styles['AlertBox'])
        story.append(diag_text)
        story.append(Spacer(1, 0.2*inch))
        
        # KPI Summary
        story.append(Paragraph("KEY PERFORMANCE INDICATORS", self.styles['CustomHeading']))
        
        kpi_data = [
            ['Metric', 'Value', 'Status'],
            ['Cooling Load', f"{audit_result.cooling_load_kw:.2f} kW", ''],
            ['Cooling Capacity', f"{audit_result.cooling_capacity_tr:.2f} TR", ''],
            ['Chiller kW/TR', f"{audit_result.chiller_kw_per_tr:.3f}", audit_result.chiller_efficiency_status.upper()],
            ['Plant kW/TR', f"{audit_result.plant_kw_per_tr:.3f}", audit_result.plant_efficiency_status.upper()],
            ['Chiller COP', f"{audit_result.cop:.2f}", ''],
            ['Plant COP', f"{audit_result.plant_cop:.2f}", ''],
            ['CHW ΔT', f"{audit_result.delta_t:.2f}°C", audit_result.delta_t_status],
        ]
        
        if audit_result.tower_range:
            kpi_data.append(['Cooling Tower Range', f"{audit_result.tower_range:.2f}°C", ''])
        if audit_result.tower_approach:
            kpi_data.append(['Cooling Tower Approach', f"{audit_result.tower_approach:.2f}°C", audit_result.tower_status])
        
        kpi_table = Table(kpi_data, colWidths=[2.5*inch, 1.5*inch, 2.5*inch])
        kpi_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F3460')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(kpi_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Add efficiency chart
        chart_buf = self._create_kpi_chart(audit_result.chiller_kw_per_tr, audit_result.plant_kw_per_tr)
        if chart_buf:
            img = Image(chart_buf, width=6*inch, height=3*inch)
            story.append(img)
            story.append(Spacer(1, 0.3*inch))
        
        # Financial Impact
        story.append(Paragraph("FINANCIAL & ENVIRONMENTAL IMPACT", self.styles['CustomHeading']))
        
        financial_data = [
            ['Parameter', 'Value'],
            ['Total Plant Power', f"{audit_result.total_plant_power:.2f} kW"],
            ['Energy Consumption/Day', f"{audit_result.energy_kwh_per_day:,.2f} kWh"],
            ['Energy Consumption/Month', f"{audit_result.energy_kwh_per_month:,.2f} kWh"],
            ['Energy Consumption/Year', f"{audit_result.energy_kwh_per_year:,.2f} kWh"],
            ['Operating Cost/Day', f"₹{audit_result.cost_per_day:,.2f}"],
            ['Operating Cost/Month', f"₹{audit_result.cost_per_month:,.2f}"],
            ['Operating Cost/Year', f"₹{audit_result.cost_per_year:,.2f}"],
            ['CO₂ Emissions/Year', f"{audit_result.co2_kg_per_year:,.2f} kg"],
        ]
        
        if audit_result.estimated_savings_inr_per_day:
            financial_data.append(['Potential Savings/Day', f"₹{audit_result.estimated_savings_inr_per_day:,.2f}"])
            financial_data.append(['Potential Savings/Year', f"₹{audit_result.estimated_savings_inr_per_day * audit_result.inputs.operating_days_per_year:,.2f}"])
        
        financial_table = Table(financial_data, colWidths=[3*inch, 3.5*inch])
        financial_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#16A085')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#E8F8F5')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(financial_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Recommendations
        story.append(Paragraph("OPTIMIZATION RECOMMENDATIONS", self.styles['CustomHeading']))
        
        for idx, rec in enumerate(audit_result.recommendations, 1):
            rec_text = Paragraph(f"{idx}. {rec}", self.styles['CustomBody'])
            story.append(rec_text)
            story.append(Spacer(1, 0.1*inch))
        
        story.append(Spacer(1, 0.3*inch))
        
        # Efficiency Benchmarks
        story.append(Paragraph("INDUSTRY EFFICIENCY BENCHMARKS", self.styles['CustomHeading']))
        
        benchmark_data = [
            ['Category', 'Excellent', 'Good', 'Poor'],
            ['Chiller kW/TR', '< 0.6', '0.6 - 0.8', '> 0.8'],
            ['Plant kW/TR', '< 0.75', '0.75 - 0.95', '> 0.95'],
            ['COP', '> 5.0', '4.0 - 5.0', '< 4.0'],
            ['CHW ΔT', '5 - 7°C', '4 - 8°C', '< 4°C'],
            ['Tower Approach', '< 4°C', '4 - 6°C', '> 6°C'],
        ]
        
        benchmark_table = Table(benchmark_data, colWidths=[2*inch, 1.5*inch, 1.5*inch, 1.5*inch])
        benchmark_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#34495E')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (1, 1), (1, -1), colors.HexColor('#D5F4E6')),
            ('BACKGROUND', (2, 1), (2, -1), colors.HexColor('#FFF9E6')),
            ('BACKGROUND', (3, 1), (3, -1), colors.HexColor('#FADBD8')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
        ]))
        story.append(benchmark_table)
        
        # Build PDF
        doc.build(story, onFirstPage=self._create_header_footer, onLaterPages=self._create_header_footer)
        
        buffer.seek(0)
        return buffer
