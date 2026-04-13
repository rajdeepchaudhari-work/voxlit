import Nav from './components/Nav'
import Hero from './components/Hero'
import TrustBar from './components/TrustBar'
import AppLogoStrip from './components/AppLogoStrip'
import HowItWorks from './components/HowItWorks'
import FeatureGrid from './components/FeatureGrid'
import ComparisonTable from './components/ComparisonTable'
import TechSpecs from './components/TechSpecs'
import Testimonials from './components/Testimonials'
import FAQ from './components/FAQ'
import DownloadCTA from './components/DownloadCTA'
import Footer from './components/Footer'

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <TrustBar />
        <AppLogoStrip />
        <FeatureGrid />
        <HowItWorks />
        <ComparisonTable />
        <TechSpecs />
        <Testimonials />
        <FAQ />
        <DownloadCTA />
      </main>
      <Footer />
    </>
  )
}
