import Nav from './components/Nav'
import Hero from './components/Hero'
import TrustBar from './components/TrustBar'
import HowItWorks from './components/HowItWorks'
import FeatureGrid from './components/FeatureGrid'
import ComparisonTable from './components/ComparisonTable'
import TechSpecs from './components/TechSpecs'
import Testimonials from './components/Testimonials'
import DownloadCTA from './components/DownloadCTA'
import Footer from './components/Footer'

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <TrustBar />
        <HowItWorks />
        <FeatureGrid />
        <ComparisonTable />
        <TechSpecs />
        <Testimonials />
        <DownloadCTA />
      </main>
      <Footer />
    </>
  )
}
