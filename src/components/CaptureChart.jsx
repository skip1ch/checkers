import { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'

export default function CaptureChart({ history, iAm = true }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return
    let mc = 0, oc = 0
    const myData = [], oppData = [], labels = []
    history.forEach((m, i) => {
      const isMine = iAm ? m.white : !m.white
      if (isMine) mc += m.caps.length; else oc += m.caps.length
      myData.push(mc); oppData.push(oc); labels.push(i+1)
    })
    const chart = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label:'Ваши взятия', data:myData, borderColor:'#6b4423', backgroundColor:'rgba(107,68,35,0.12)', borderWidth:2, tension:0.35, fill:true, pointRadius:0, pointHoverRadius:4 },
          { label:'Взятия противника', data:oppData, borderColor:'#c9a227', backgroundColor:'rgba(201,162,39,0.1)', borderWidth:2, tension:0.35, fill:true, pointRadius:0, pointHoverRadius:4 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 0 },
        interaction: { mode:'index', intersect:false },
        plugins: {
          legend: { position:'top', labels:{ font:{size:11,family:'Inter'}, color:'#6b5040', boxWidth:12, padding:16 } },
          tooltip: { backgroundColor:'#fffaf4', titleColor:'#2b1810', bodyColor:'#6b5040', borderColor:'rgba(107,68,35,0.2)', borderWidth:1 }
        },
        scales: {
          x: { grid:{ color:'rgba(107,68,35,0.07)' }, ticks:{ color:'#a08060', font:{size:10}, maxTicksLimit:10 } },
          y: { beginAtZero:true, grid:{ color:'rgba(107,68,35,0.07)' }, ticks:{ color:'#a08060', font:{size:10}, stepSize:1 } }
        }
      }
    })
    return () => chart.destroy()
  }, [])

  return <canvas ref={canvasRef}/>
}
