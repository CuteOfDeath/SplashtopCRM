import { useEffect, useState } from "react"
import { Button, Container, Nav, Navbar, Table } from "react-bootstrap"



interface RecordRow {
    "ID": number
    "Nazwa": string
    "Nazwa Urządzenia": string
    "Nazwa Klienta": string
    "System Operacyjny": string
    "Wersja Streamera": string
    "Adres IP"?: string
    "Ostatnia Sesja": string
    "Ostatnio Online": string
    "Ostatnio Zalogowany"? : string,
    "Adres IP LAN"? : string
    "Notatka"?: string
}

interface TableQueryResult {
    success: true
    table?: string
    result: RecordRow[]
}

export default function Dashboard() {
    const [loading, setLoading] = useState<boolean>(true)
    const [tableRange, setTableRange] = useState<[number, number]>([0, 50])
    const [recordTable, setRecordTable] = useState<RecordRow[] | undefined>(undefined)
    const [displayTable, setDisplayTable] = useState<RecordRow[] | undefined>(undefined)
    const [showOffCanvas, setShowOffCanvas] = useState<boolean>(false)
    const [currentTable, setCurrentTable] = useState<string | undefined>(undefined)
    const [currentRecordInfo, setRecordInfo] = useState<RecordRow | undefined>(undefined)

    async function loadTable() {
        if (currentTable == undefined){
            try {
                const response = await fetch("//127.0.0.1/CRM/api/view_latest_report.php", {
                    method: "GET"
                })
                const data: TableQueryResult = await response.json()
                setRecordTable(data.result)
                setCurrentTable(data.table)
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
    }

    async function handleDetailClick(id: number) {
        try {
            const response = await fetch("//127.0.0.1/CRM/api/get_record.php", {
                method: "POST",
                body: JSON.stringify({
                    id: id,
                    table: currentTable
                })
            })
            const data: TableQueryResult = await response.json()
            
        } catch (error) {
            console.error(error)
        } finally {
            setShowOffCanvas(true)
        }
    }

    // fetch once on mount
    useEffect(() => {
        if (!recordTable) {
            void loadTable()
        }
    }, [])

    useEffect(() => {
        if (recordTable) {
            setDisplayTable(recordTable)
        }
    }, [recordTable, tableRange])

    return (
        <>
            <Navbar expand="lg" className="bg-body-tertiary">
                <Container>
                    <Navbar.Brand href="#">Cemit</Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="me-auto">
                            <Nav.Link href="#">Importuj CSV</Nav.Link>
                            <Nav.Link href="#">Dodaj Aktywność</Nav.Link>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>
            <Container>
                {loading && <p>Ładowanie...</p>}

                {!loading && displayTable && (
                    <Table striped bordered hover>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nazwa</th>
                                <th>Nazwa Urządzenia</th>
                                <th>Nazwa Klienta</th>
                                <th>System Operacyjny</th>
                                <th>Wersja Streamera</th>
                                <th>Ostatnia Sesja</th>
                                <th>Ostatnio Online</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayTable.map((row, index) => (
                                <tr key={index}>
                                    <td>{row["ID"]}</td>
                                    <td>{row["Nazwa"]}</td>
                                    <td>{row["Nazwa Urządzenia"]}</td>
                                    <td>{row["Nazwa Klienta"]}</td>
                                    <td>{row["System Operacyjny"]}</td>
                                    <td>{row["Wersja Streamera"]}</td>
                                    <td>{row["Ostatnia Sesja"]}</td>
                                    <td>{row["Ostatnio Online"]}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </Container>
        </>
    )
}
