import { useEffect, useState } from "react"
import { Button, Container, Nav, Navbar, Table } from "react-bootstrap"

interface RecordRow {
    "Nazwa": string
    "Nazwa Klienta": string
    "Ostatnia Sesja": string
    "Ostatnio Online": string
}

interface QueryResult {
    success: true
    table: string
    result: RecordRow[]
}

export default function Dashboard() {
    const [loading, setLoading] = useState<boolean>(true)
    const [tableRange, setTableRange] = useState<[number, number]>([0, 50])
    const [recordTable, setRecordTable] = useState<RecordRow[] | null>(null)
    const [displayTable, setDisplayTable] = useState<RecordRow[] | null>(null)
    const [showOffCanvas, SetShowOffCanvas] = useState<boolean>(false)

    async function loadTable() {
        try {
            const response = await fetch("//127.0.0.1/CRM/api/view_latest_report.php", {
                method: "GET"
            })
            const data: QueryResult = await response.json()
            setRecordTable(data.result)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }
    function stripNip(name: string): string {
        return name.replace(/\s*\[\d+\]\s*$/, "").trim()
    }

    function clampAndClean(table: RecordRow[]): RecordRow[] {
        const [start, end] = tableRange
        return table.slice(start, end).map((row) => ({
            ...row,
            "Nazwa Klienta": stripNip(row["Nazwa Klienta"])
        }))
    }

    // fetch once on mount
    useEffect(() => {
        if (!recordTable) {
            void loadTable()
        }
    }, [])

    useEffect(() => {
        if (recordTable) {
            setDisplayTable(clampAndClean(recordTable))
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
                                <th>Nazwa</th>
                                <th>Nazwa Klienta</th>
                                <th>Ostatnia Sesja</th>
                                <th>Ostatnio Online</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayTable.map((row, index) => (
                                <tr key={index}>
                                    <td>{row["Nazwa"]}</td>
                                    <td>{row["Nazwa Klienta"]}</td>
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
