import Nav from './components/Nav'
import Hero from './components/Hero'
import WhatsNew from './components/WhatsNew'
import Features from './components/Features'
import Install from './components/Install'
import Footer from './components/Footer'

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <WhatsNew />
        <Features />
        <Install />
      </main>
      <Footer />
    </>
  )
}
